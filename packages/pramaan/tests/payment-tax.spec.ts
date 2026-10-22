import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { createBookingPayment } from "../../app-store/pramaan-payment/lib/gateway";
const ref = `ref_${"0".repeat(26)}`;
const input = { bookingId: 1, amount: 100, currency: "usd", title: "Booking", email: "guest@example.test", successUrl: "https://booking.example.test/payment", cancelUrl: "https://booking.example.test/payment" };

test("one tax setting reaches the link and fallback checkout with defaults and overrides", async () => {
  const previous = process.env.PRAMAAN_TAX_CATEGORY;
  try {
    for (const configured of [undefined, "  ", "live_tutoring"]) {
      if (configured === undefined) delete process.env.PRAMAAN_TAX_CATEGORY;
      else process.env.PRAMAAN_TAX_CATEGORY = configured;
      const fake = new FakePramaan({
        [Cap.paymentsPaymentLinkCreate]: () => { throw new PramaanError("connection_required", "refused", { status: 400, requestId: "req_fixture" }); },
        [Cap.paymentsCheckoutCreate]: () => ({ ref, checkoutUrl: "https://payment.example.test/once" }),
      });
      await createBookingPayment(input, "conn_fixture", fake);
      expect(fake.calls).toHaveLength(2);
      for (const call of fake.calls) {
        expect(call.input).toHaveProperty("taxCategory", configured?.trim() || "digital_products");
        expect(call.opts?.idempotencyKey).toBeTruthy();
      }
    }
    process.env.PRAMAAN_TAX_CATEGORY = "unknown";
    const fake = new FakePramaan();
    await expect(createBookingPayment(input, "conn_fixture", fake)).rejects.toThrow("PRAMAAN_TAX_CATEGORY");
    expect(fake.calls).toHaveLength(0);
  } finally {
    if (previous === undefined) delete process.env.PRAMAAN_TAX_CATEGORY;
    else process.env.PRAMAAN_TAX_CATEGORY = previous;
  }
});
