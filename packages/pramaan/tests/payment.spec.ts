import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { createBookingPayment, checkBookingPayment, paymentCall } from "../../app-store/pramaan-payment/lib/gateway";
import { bookingPaymentEmailLink } from "../../lib/payment/link";
import { dispatchEmail } from "../../emails/lib/dispatch-email";
const account = "conn_fixture";
const ref = `ref_${"0".repeat(26)}`, paymentRef = `ref_${"1".repeat(26)}`;
const checkoutUrl = "https://payment.example.test/once";
const input = { bookingId: 1, amount: 2500, currency: "usd", title: "Visit", email: "guest@example.test", successUrl: "https://booking.example.test/payment/fixture", cancelUrl: "https://booking.example.test/payment/fixture" };
const paid = { status: "paid", payments: [{ status: "captured", ref: paymentRef, amount: { amount: 2500, currency: "USD" } }] };

test("booking creates a link with notifications off and emails the stable product address", async () => {
  const fake = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => ({ ref, paymentLinkId: "fixture", status: "created", paymentUrl: checkoutUrl }), [Cap.emailSend]: () => ({ status: "queued" }) });
  const created = await createBookingPayment(input, account, fake); await createBookingPayment(input, account, fake);
  expect(created.kind).toBe("payment-link");
  expect(fake.calls[0].input).toMatchObject({ amount: 2500, currency: "USD", taxCategory: "digital_products", customer: { email: input.email }, allowPartial: false, notifyEmail: false, notifySms: false, reminders: false });
  expect(fake.calls[0].opts?.account).toBe(account);
  expect(fake.calls[0].opts?.idempotencyKey).toBe(fake.calls[1].opts?.idempotencyKey);
  const link = bookingPaymentEmailLink({ uid: "fixture", data: { paymentLinkRef: created.ref, paymentUrl: created.paymentUrl } });
  expect(link.endsWith("/payment/fixture")).toBe(true);
  await dispatchEmail({ from: "sender@example.test", to: input.email, subject: "Complete your booking", text: `Pay here: ${link}` }, { origin: "https://booking.example.test", secret: "fixture" }, fake);
  expect(fake.calls[2].id).toBe(Cap.emailSend);
  expect((fake.calls[2].input as any).text).toContain(link);
});
test("definite link refusals use checkout once and keep its own email path", async () => {
  for (const code of ["upstream_unavailable", "connection_required"] as const) {
    const fake = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => { throw new PramaanError(code, "hidden", { status: 502, requestId: "req_fixture" }); }, [Cap.paymentsCheckoutCreate]: () => ({ ref, checkoutUrl }) });
    const created = await createBookingPayment(input, account, fake);
    expect(created).toEqual({ ref, paymentUrl: checkoutUrl, kind: "checkout" });
    expect(fake.calls.map(call => call.id)).toEqual([Cap.paymentsPaymentLinkCreate, Cap.paymentsCheckoutCreate]);
    expect(fake.calls[1].input).toMatchObject({ taxCategory: "digital_products", successUrl: input.successUrl, cancelUrl: input.cancelUrl });
    expect(fake.calls[0].opts?.idempotencyKey).not.toBe(fake.calls[1].opts?.idempotencyKey);
    expect(bookingPaymentEmailLink({ uid: "fixture", data: { checkoutRef: ref, paymentUrl: checkoutUrl } })).toBe(checkoutUrl);
  }
});
test("link reads verify captured totals and refresh temporary URLs without changing source", async () => {
  const payment = { ref: paymentRef, amount: { amount: 2500, currency: "USD" } };
  for (const response of [{ status: "paid", payments: [payment] }, { status: "paid", payments: [] }, { status: "paid", payments: [{ ...payment, amount: { amount: 1, currency: "USD" } }] }, { status: "unknown", payments: [payment] }, { status: "paid", payments: [payment], amountPaid: { amount: 1, currency: "USD" } }]) {
    const fake = new FakePramaan({ [Cap.paymentsPaymentLinkGet]: () => response });
    const result = await checkBookingPayment({ externalId: ref, paymentLinkRef: ref, amount: 2500, currency: "usd" }, account, fake);
    expect(result.paid).toBe(response.status === "paid" && response.payments.length === 1 && response.payments[0].amount.amount === 2500 && !("amountPaid" in response));
    expect(fake.calls.map(call => call.id)).toEqual([Cap.paymentsPaymentLinkGet]);
  }
  for (const url of [undefined, "https://payment.example.test/fresh"]) {
    const fake = new FakePramaan({ [Cap.paymentsPaymentLinkGet]: () => ({ status: "created", paymentUrl: url }) });
    expect((await checkBookingPayment({ externalId: ref, paymentLinkRef: ref, paymentUrl: checkoutUrl, amount: 2500, currency: "USD" }, account, fake)).paymentUrl).toBe(url);
  }
  const fake = new FakePramaan({ [Cap.paymentsPaymentLinkGet]: () => { throw new PramaanError("upstream_unavailable", "hidden", { status: 502, requestId: "req_fixture" }); } });
  await expect(checkBookingPayment({ externalId: ref, paymentLinkRef: ref, amount: 2500, currency: "USD" }, account, fake)).rejects.toThrow();
  expect(fake.calls).toHaveLength(1);
});
test("completed, partial, authorised, unknown and wrong-currency checkouts never confirm a booking", async () => {
  for (const response of [{ ...paid, status: "completed" }, { ...paid, status: "unknown" }, { ...paid, payments: [{ ...paid.payments[0], amount: { amount: 1, currency: "USD" } }] }, { ...paid, payments: [{ ...paid.payments[0], status: "authorised" }] }, { ...paid, payments: [{ ...paid.payments[0], amount: { amount: 2500, currency: "EUR" } }] }, paid]) {
    const fake = new FakePramaan({ [Cap.paymentsCheckoutGet]: () => response });
    const result = await checkBookingPayment({ externalId: ref, checkoutRef: ref, paymentUrl: checkoutUrl, amount: 2500, currency: "usd" }, account, fake);
    expect(result.paid).toBe(response === paid);
    expect(fake.calls[0].input).toEqual({ ref });
    expect(result.paymentUrl).toBe(checkoutUrl);
  }
});
test("uncertain or invalid link starts are never resent or replaced", async () => {
  for (const code of ["upstream_unavailable", "invalid_request", "internal", "rate_limited"] as const) {
    const fake = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => { throw new PramaanError(code, "hidden"); } });
    await expect(createBookingPayment(input, account, fake)).rejects.toThrow();
    expect(fake.calls).toHaveLength(1); expect(fake.calls[0].id).toBe(Cap.paymentsPaymentLinkCreate);
  }
});
test("missing checkout references, unsafe URLs and legacy records cannot guess a payment source", async () => {
  for (const response of [{ paymentUrl: checkoutUrl }, { ref, paymentLinkId: "fixture", status: "created", paymentUrl: "javascript:alert(1)" }]) {
    const fake = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => response });
    await expect(createBookingPayment(input, account, fake)).rejects.toThrow("Check before trying again");
  }
  const fake = new FakePramaan();
  expect(await checkBookingPayment({ externalId: "older-link", amount: 2500, currency: "USD" }, account, fake)).toMatchObject({ paid: false, status: "unknown" });
  expect(fake.calls).toHaveLength(0);
});
test("checkout fake rejects payment-link fields and invalid read selectors", async () => {
  const fake = new FakePramaan({ [Cap.paymentsCheckoutCreate]: () => ({}), [Cap.paymentsCheckoutGet]: () => ({}) });
  await expect(fake.call(Cap.paymentsCheckoutCreate, { amount: 2500, notifyEmail: true }, { idempotencyKey: "fixture" })).rejects.toThrow("Invalid checkout");
  await expect(fake.call(Cap.paymentsCheckoutGet, { ref, checkoutId: "other" })).rejects.toThrow("Invalid checkout");
});
test("billing refunds preserve pending instead of announcing completion", async () => {
  const fake = new FakePramaan({ [Cap.billingRefundCreate]: () => ({ status: "pending" }) });
  expect(await paymentCall(Cap.billingRefundCreate, { transactionId: "charge_fixture" }, account, "refund:charge_fixture", fake)).toEqual({ status: "pending" });
});
test("billing customer, portal, subscription, status and cancellation use the same boundary", async () => {
  const { billingAction } = await import("../../features/billing/platform-billing");
  const ids = [Cap.billingCustomerCreate, Cap.billingPortalCreate, Cap.billingSubscriptionCreate, Cap.billingSubscriptionGet, Cap.billingSubscriptionCancel];
  const fake = new FakePramaan(Object.fromEntries(ids.map(id => [id, () => ({ status: "pending" })])));
  for (const action of ["customer", "portal", "start", "status", "cancel"] as const) await billingAction(action, { customerId: "fixture" }, account, fake);
  expect(fake.calls.map(call => call.id)).toEqual(ids);
  expect(fake.calls.every(call => call.opts?.account === account)).toBe(true);
  expect(fake.calls[3]!.opts?.idempotencyKey).toBeUndefined();
});

test("an uncertain fallback is not retried and accepted jobs never start a fallback", async () => {
  const fake = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => { throw new PramaanError("upstream_unavailable", "hidden", { status: 502, requestId: "req_fixture" }); }, [Cap.paymentsCheckoutCreate]: () => { throw new PramaanError("upstream_unavailable", "hidden"); } });
  await expect(createBookingPayment(input, account, fake)).rejects.toThrow();
  expect(fake.calls.map(call => call.id)).toEqual([Cap.paymentsPaymentLinkCreate, Cap.paymentsCheckoutCreate]);
  const accepted = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => { throw new PramaanError("upstream_unavailable", "hidden", { status: 502, requestId: "req_fixture", jobId: "job_fixture" }); } });
  await expect(createBookingPayment(input, account, accepted)).rejects.toThrow();
  expect(accepted.calls).toHaveLength(1);
});
test("conflicting payment selectors cannot choose a source", async () => {
  const fake = new FakePramaan();
  expect(await checkBookingPayment({ externalId: ref, paymentLinkRef: ref, checkoutRef: ref, amount: 2500, currency: "USD" }, account, fake)).toMatchObject({ paid: false, status: "unknown" });
  expect(fake.calls).toHaveLength(0);
});
