import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ check: vi.fn(), confirm: vi.fn(), paymentGet: vi.fn(), paymentUpdate: vi.fn(), bookingGet: vi.fn() }));
vi.mock("@scheduling/app-store/pramaan-payment/lib/gateway", () => ({ checkBookingPayment: mocks.check }));
vi.mock("@scheduling/app-store/_utils/payments/handlePaymentSuccess", () => ({ handlePaymentSuccess: mocks.confirm }));
vi.mock("@scheduling/lib/tracing/factory", () => ({ distributedTracing: { createTrace: () => ({}) } }));
vi.mock("@scheduling/lib/constants", () => ({ WEBAPP_URL: "http://localhost:3198" }));
vi.mock("@scheduling/prisma", () => ({ default: { payment: { findUnique: mocks.paymentGet, updateMany: mocks.paymentUpdate }, booking: { findUnique: mocks.bookingGet } } }));
import { HttpError } from "@scheduling/lib/http-error";
import { POST } from "../route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.paymentGet.mockResolvedValue({ id: 1, uid: "fixture", appId: "pramaan-payment", bookingId: 2, booking: { status: "ACCEPTED" }, success: false, data: { account: "conn_fixture", checkoutRef: "fixture-ref" } });
  mocks.paymentUpdate.mockResolvedValue({ count: 1 });
  mocks.check.mockResolvedValue({ paid: true, status: "paid", capturedPayments: [{ ref: "fixture-payment" }], paymentRef: "fixture-payment" });
  mocks.bookingGet.mockResolvedValue({ paid: true });
});
it("returns confirmed payment after the handler's successful HTTP signal", async () => {
  mocks.confirm.mockRejectedValue(new HttpError({ statusCode: 200 }));
  const response = await POST(new Request("http://localhost:3198/api/booking-payment/fixture", { method: "POST", headers: { origin: "http://localhost:3198" } }), { params: Promise.resolve({ uid: "fixture" }) });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ confirmed: true, paid: true });
  expect(mocks.confirm).toHaveBeenCalledTimes(1);
});
it("does not hide a failed confirmation or retry its side effects", async () => {
  mocks.confirm.mockRejectedValue(new HttpError({ statusCode: 500 }));
  const response = await POST(new Request("http://localhost:3198/api/booking-payment/fixture", { method: "POST", headers: { origin: "http://localhost:3198" } }), { params: Promise.resolve({ uid: "fixture" }) });
  expect(response.status).toBe(422);
  expect(mocks.confirm).toHaveBeenCalledTimes(1);
});

it("reads the saved link selector and keeps captured references out of the guest response", async () => {
  mocks.paymentGet.mockResolvedValue({ id: 1, uid: "fixture", appId: "pramaan-payment", bookingId: 2, booking: { status: "ACCEPTED" }, success: false, data: { account: "conn_fixture", paymentLinkRef: "fixture-link" } });
  mocks.confirm.mockResolvedValue(undefined);
  const response = await POST(new Request("http://localhost:3198/api/booking-payment/fixture", { method: "POST", headers: { origin: "http://localhost:3198" } }), { params: Promise.resolve({ uid: "fixture" }) });
  expect(response.status).toBe(200);
  expect(mocks.check.mock.calls[0][0]).toMatchObject({ paymentLinkRef: "fixture-link", checkoutRef: undefined });
  const body = JSON.stringify(await response.json());
  expect(body).not.toContain("fixture-link");
  expect(body).not.toContain("fixture-payment");
});
