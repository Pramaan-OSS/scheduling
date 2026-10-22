import { beforeEach, expect, it, vi } from "vitest";
import { FakePramaan } from "@scheduling/pramaan/fake";
import { Cap, PramaanError } from "@scheduling/pramaan";
const { db } = vi.hoisted(() => ({ db: { payment: { findFirst: vi.fn(), create: vi.fn() }, booking: { findUnique: vi.fn() } } }));
vi.mock("@scheduling/prisma", () => ({ default: db }));
vi.mock("@scheduling/lib/constants", () => ({ WEBAPP_URL: "https://booking.example.test" }));
import { BookingPaymentService } from "./PaymentService";
const ref = `ref_${"0".repeat(26)}`;
const checkoutUrl = "https://payment.example.test/checkout";
beforeEach(() => { vi.resetAllMocks(); db.payment.findFirst.mockResolvedValue(null); db.booking.findUnique.mockResolvedValue({ uid: "fixture-booking-random" }); db.payment.create.mockImplementation(({ data }) => ({ id: 1, ...data })); });
it("stores payment-link ref and URL and reuses the existing request", async () => {
  const fake = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => ({ ref, paymentLinkId: "fixture", status: "created", paymentUrl: checkoutUrl }) });
  const service = new BookingPaymentService({ key: { account: "conn_fixture" } }, fake);
  const result = await service.create({ amount: 2500, currency: "USD" }, 42, null, null, null, "ON_BOOKING", "guest@example.test");
  expect(result).toMatchObject({ uid: "fixture-booking-random-payment", externalId: ref, data: { account: "conn_fixture", paymentLinkRef: ref, paymentUrl: checkoutUrl }, success: false });
  expect(fake.calls[0].input).toMatchObject({ notifyEmail: false, notifySms: false, reminders: false });
  db.payment.findFirst.mockResolvedValue(result);
  expect(await service.create({ amount: 2500, currency: "USD" }, 42, null, null, null, "ON_BOOKING", "guest@example.test")).toBe(result);
  expect(fake.calls).toHaveLength(1);
});
it("an uncertain checkout is not marked paid, persisted as success or retried", async () => {
  const fake = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => { throw new PramaanError("upstream_unavailable", "private"); } });
  const service = new BookingPaymentService({ key: { account: "conn_fixture" } }, fake);
  await expect(service.create({ amount: 2500, currency: "USD" }, 42, null, null, null, "ON_BOOKING", "guest@example.test")).rejects.toThrow("not available yet");
  expect(fake.calls).toHaveLength(1); expect(db.payment.create).not.toHaveBeenCalled();
});
it("checkout cancellation never uses a retired payment-link action or reports success", async () => {
  const fake = new FakePramaan();
  expect(await new BookingPaymentService({ key: { account: "conn_fixture" } }, fake).deletePayment(1)).toBe(false);
  expect(fake.calls).toHaveLength(0);
});

it("stores and reuses checkout only after a definite link refusal", async () => {
  const fake = new FakePramaan({ [Cap.paymentsPaymentLinkCreate]: () => { throw new PramaanError("connection_required", "hidden", { status: 409, requestId: "req_fixture" }); }, [Cap.paymentsCheckoutCreate]: () => ({ ref, checkoutUrl }) });
  const service = new BookingPaymentService({ key: { account: "conn_fixture" } }, fake);
  const result = await service.create({ amount: 2500, currency: "USD" }, 42, null, null, null, "ON_BOOKING", "guest@example.test");
  expect(result.data).toMatchObject({ checkoutRef: ref, paymentUrl: checkoutUrl });
  expect(result.data).not.toHaveProperty("paymentLinkRef");
  db.payment.findFirst.mockResolvedValue(result);
  expect(await service.create({ amount: 2500, currency: "USD" }, 42, null, null, null, "ON_BOOKING", "guest@example.test")).toBe(result);
  expect(fake.calls.map(call => call.id)).toEqual([Cap.paymentsPaymentLinkCreate, Cap.paymentsCheckoutCreate]);
});
