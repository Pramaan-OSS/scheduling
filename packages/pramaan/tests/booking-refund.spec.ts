import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { requestBookingRefund, OUTSIDE_REFUND, type RefundPayment, type RefundStore } from "../../features/bookings/refunds/service";
const paymentRef = `ref_${"1".repeat(26)}`;
const requestId = "00000000-0000-4000-8000-000000000001";
function fixture(ref: string | undefined = paymentRef) {
  let payment: RefundPayment = { id: 1, bookingHostId: 10, success: true, refunded: false, amount: 2500, currency: "usd", data: { account: "conn_fixture", ...(ref ? { paymentRef: ref } : {}) } };
  const store: RefundStore = {
    async get() { return structuredClone(payment); },
    async claim(old, data) { if (JSON.stringify(payment.data) !== JSON.stringify(old.data)) return false; payment.data = data; return true; },
    async finish(_id, _request, data, refunded) { payment.data = data; payment.refunded = refunded; },
  };
  return { store, current: () => payment };
}
const input = { paymentId: 1, hostId: 10, requestId, approved: true };
test("full refund is host-approved, durable, idempotent and pending rather than refunded", async () => {
  const f = fixture(); const fake = new FakePramaan({ [Cap.paymentsPaymentReverse]: () => {
    expect(f.current().data.refund.status).toBe("starting"); return { status: "pending" };
  } });
  expect(await requestBookingRefund(f.store, input, fake)).toMatchObject({ status: "pending" });
  expect(fake.calls[0]?.input).toEqual({ ref: paymentRef });
  expect(fake.calls[0]?.opts?.idempotencyKey).toContain(requestId);
  expect(f.current().refunded).toBe(false);
  await requestBookingRefund(f.store, input, fake);
  await requestBookingRefund(f.store, { ...input, requestId: "00000000-0000-4000-8000-000000000002" }, fake);
  expect(fake.calls).toHaveLength(1);
});
test("partial refund uses the captured reference and charge currency; success records only the part", async () => {
  const f = fixture(); const fake = new FakePramaan({ [Cap.billingRefundCreate]: () => ({ status: "succeeded" }) });
  expect(await requestBookingRefund(f.store, { ...input, amount: 500 }, fake)).toMatchObject({ status: "succeeded" });
  expect(fake.calls[0]?.input).toEqual({ ref: paymentRef, amount: { amount: 500, currency: "USD" } });
  expect(f.current().data.refundedAmount).toBe(500); expect(f.current().refunded).toBe(false);
});
test("missing reference and unknown payment cannot refund, and approval and host are checked", async () => {
  const f = fixture(""); const fake = new FakePramaan();
  expect(await requestBookingRefund(f.store, input, fake)).toMatchObject({ message: OUTSIDE_REFUND });
  await expect(requestBookingRefund(f.store, { ...input, hostId: 99 }, fake)).rejects.toThrow("host");
  await expect(requestBookingRefund(f.store, { ...input, approved: false }, fake)).rejects.toThrow("approve");
  expect(fake.calls).toHaveLength(0);
});
test("refused or unavailable requests show outside refund guidance without success", async () => {
  for (const code of ["invalid_request", "upstream_unavailable"] as const) {
    const f = fixture(); const fake = new FakePramaan({ [Cap.paymentsPaymentReverse]: () => { throw new PramaanError(code, "ref unsupported"); } });
    expect(await requestBookingRefund(f.store, input, fake)).toEqual({ status: "unavailable", message: OUTSIDE_REFUND });
    expect(f.current().refunded).toBe(false); expect(fake.calls).toHaveLength(1);
  }
});
test("uncertain results and lost answers are not resent, even with a new request id", async () => {
  for (const response of [new Error("lost answer"), new PramaanError("upstream_unavailable", "lost", { retryable: true }), { status: "unknown" }]) {
    const f = fixture(); const fake = new FakePramaan({ [Cap.paymentsPaymentReverse]: () => { if (response instanceof Error) throw response; return response; } });
    expect((await requestBookingRefund(f.store, input, fake)).status).toBe("uncertain");
    await requestBookingRefund(f.store, { ...input, requestId: "00000000-0000-4000-8000-000000000002" }, fake);
    expect(fake.calls).toHaveLength(1); expect(f.current().refunded).toBe(false);
  }
});

test("concurrent approvals claim only one durable refund request", async () => {
  const f = fixture(); const fake = new FakePramaan({ [Cap.paymentsPaymentReverse]: () => ({ status: "pending" }) });
  await Promise.all([requestBookingRefund(f.store, input, fake), requestBookingRefund(f.store, { ...input, requestId: "00000000-0000-4000-8000-000000000002" }, fake)]);
  expect(fake.calls).toHaveLength(1);
});

test("a mismatched partial-success amount stays uncertain and does not mark money refunded", async () => {
  const f = fixture(); const fake = new FakePramaan({ [Cap.billingRefundCreate]: () => ({ status: "succeeded", amount: { amount: 600, currency: "USD" } }) });
  expect((await requestBookingRefund(f.store, { ...input, amount: 500 }, fake)).status).toBe("uncertain");
  expect(f.current().data.refundedAmount).toBe(0); expect(f.current().refunded).toBe(false);
});

test("legacy identifiers and lowercase charge currency remain valid contract inputs", async () => {
  const fake = new FakePramaan({ [Cap.billingRefundCreate]: () => ({ status: "pending" }), [Cap.paymentsPaymentReverse]: () => ({ status: "pending" }) });
  await fake.refundPayment({ transactionId: "transaction_fixture", amount: { amount: 500, currency: "usd" } }, { idempotencyKey: "legacy-partial" });
  await fake.reversePayment({ paymentId: "payment_fixture" }, { idempotencyKey: "legacy-full" });
  expect(fake.calls).toHaveLength(2);
});
