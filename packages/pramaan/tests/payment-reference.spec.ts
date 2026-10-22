import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap } from "../src/index";
import { checkBookingPayment } from "../../app-store/pramaan-payment/lib/gateway";
const ref = `ref_${"0".repeat(26)}`;
const paymentRef = `ref_${"1".repeat(26)}`;
const input = { externalId: "legacy-link", checkoutRef: ref, amount: 2500, currency: "USD" };
const amount = { amount: 2500, currency: "USD" };
test("paid checkout is read by its create ref and identifies a matching captured payment", async () => {
  const fake = new FakePramaan({ [Cap.paymentsCheckoutGet]: () => ({ status: "paid", payments: [{ ref: paymentRef, status: "captured", amount }] }) });
  expect(await checkBookingPayment(input, "conn_fixture", fake)).toMatchObject({ paid: true, paymentRef });
  expect(fake.calls[0]?.input).toEqual({ ref });
});
test("unknown, absent and mismatched captured references never enable a refund", async () => {
  for (const result of [{ status: "unknown", payments: [] }, { status: "paid", payments: [] },
    { status: "paid", payments: [{ ref: paymentRef, status: "captured", amount: { ...amount, amount: 1 } }] }]) {
    const fake = new FakePramaan({ [Cap.paymentsCheckoutGet]: () => ({ ...result }) });
    expect((await checkBookingPayment(input, "conn_fixture", fake)).paymentRef).toBeUndefined();
  }
});

test("a paid captured snapshot can confirm the exact amount when optional totals are absent", async () => {
  const fake = new FakePramaan({ [Cap.paymentsCheckoutGet]: () => ({ status: "paid", payments: [{ ref: paymentRef, status: "captured", amount }] }) });
  expect(await checkBookingPayment(input, "conn_fixture", fake)).toMatchObject({ paid: true, paymentRef });
});

test("multiple captured rows are retained without guessing one full-refund target", async () => {
  const rows = [{ ref: paymentRef, status: "captured", amount: { amount: 1000, currency: "USD" } }, { ref: `ref_${"2".repeat(26)}`, status: "captured", amount: { amount: 1500, currency: "USD" } }];
  const fake = new FakePramaan({ [Cap.paymentsCheckoutGet]: () => ({ status: "paid", payments: rows }) });
  const result = await checkBookingPayment(input, "conn_fixture", fake);
  expect(result.capturedPayments).toEqual(rows); expect(result.paymentRef).toBeUndefined();
});
