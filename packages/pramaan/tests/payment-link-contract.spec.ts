import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap } from "../src/index";
const ref = `ref_${"0".repeat(26)}`;
test("payment-link helpers carry the adopted booking fields and one saved action identity", async () => {
  const fake = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => ({ ref, paymentLinkId: "fixture", status: "created", paymentUrl: "https://payment.example.test/link" }), [Cap.paymentsPaymentLinkGet]: () => ({ paymentLinkId: ref, status: "created" }) });
  const request = { amount: 2500, currency: "USD", customer: { email: "guest@example.test" }, allowPartial: false, notifyEmail: false, notifySms: false, reminders: false };
  expect((await fake.paymentLinkCreate(request, { idempotencyKey: "saved-fixture" })).ref).toBe(ref);
  expect((await fake.paymentLinkGet({ ref })).status).toBe("created");
  expect(fake.calls.map(call => call.id)).toEqual([Cap.paymentsPaymentLinkCreate, Cap.paymentsPaymentLinkGet]);
  expect(fake.calls[0].opts?.idempotencyKey).toBe("saved-fixture");
});
test("payment-link fakes refuse missing action keys, checkout fields and conflicting read selectors", async () => {
  const fake = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => ({}), [Cap.paymentsPaymentLinkGet]: () => ({}) });
  await expect(fake.call(Cap.paymentsPaymentLinkCreate, { amount: 1, currency: "USD" })).rejects.toThrow("Idempotency-Key");
  for (const request of [{ amount: 1, currency: "USD", successUrl: "https://booking.example.test" }, { amount: 0, currency: "USD" }, { amount: 1.5, currency: "USD" }, { amount: 1, currency: "US" }, { amount: 1, currency: "USD", notifyEmail: "yes" }])
    await expect(fake.call(Cap.paymentsPaymentLinkCreate, request, { idempotencyKey: "saved-fixture" })).rejects.toThrow("Invalid booking payment-link");
  for (const request of [{}, { ref, paymentLinkId: "other" }, { ref: "not-a-ref" }, { ref, sessionResult: "not-supported" }])
    await expect(fake.call(Cap.paymentsPaymentLinkGet, request)).rejects.toThrow("Invalid payment-link read");
});
