import prisma from "@scheduling/prisma";
import type { Payment, Prisma, PaymentOption } from "@scheduling/prisma/client";
import type { Pramaan } from "@scheduling/pramaan";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import { createBookingPayment } from "./gateway";

export class BookingPaymentService {
  private account: string;
  constructor(credentials: { key: Prisma.JsonValue }, private client?: Pramaan) {
    this.account = (credentials.key as { account?: string }).account || "";
  }
  async create(
    payment: { amount: number; currency: string },
    bookingId: number,
    _userId: number | null,
    _username: string | null,
    _name: string | null,
    option: PaymentOption,
    email: string,
    _phone?: string | null,
    title = "Booking"
  ) {
    if (option !== "ON_BOOKING") throw new Error("Saving a card for later is not available yet.");
    const existing = await prisma.payment.findFirst({ where: { bookingId, appId: "pramaan-payment" } });
    if (existing) return existing;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { uid: true } });
    if (!booking) throw new Error("Booking was not found.");
    const uid = `${booking.uid}-payment`;
    const returnUrl = `${WEBAPP_URL}/payment/${encodeURIComponent(uid)}`;
    const result = await createBookingPayment({ ...payment, bookingId, title, email, successUrl: returnUrl, cancelUrl: returnUrl }, this.account, this.client);
    return prisma.payment.create({
      data: {
        uid,
        bookingId,
        appId: "pramaan-payment",
        amount: payment.amount,
        currency: payment.currency,
        externalId: result.ref,
        data: { account: this.account, paymentUrl: result.paymentUrl, ...(result.kind === "payment-link" ? { paymentLinkRef: result.ref } : { checkoutRef: result.ref }) },
        fee: 0,
        refunded: false,
        success: false,
        paymentOption: "ON_BOOKING",
      },
    });
  }
  async collectCard(): Promise<Payment> {
    throw new Error("Saving a card for later is not available yet.");
  }
  async chargeCard(): Promise<Payment> {
    throw new Error("Automatic no-show charges are not available yet.");
  }
  async refund(): Promise<Payment | null> {
    throw new Error("Automatic refunds are off. The booking host can review a refund from booking details.");
  }
  async update(id: number, data: Partial<Prisma.PaymentUncheckedCreateInput>) {
    return prisma.payment.update({ where: { id }, data });
  }
  async getPaymentPaidStatus(): Promise<string> {
    throw new Error("Check the payment from its booking page.");
  }
  async getPaymentDetails(): Promise<Payment> {
    throw new Error("Check the payment from its booking page.");
  }
  async afterPayment() {}
  async deletePayment(_id: number) {
    // Hosted-page cancellation is not adopted; never claim that cancelling a booking closed it.
    return false;
  }
  isSetupAlready() {
    return Boolean(this.account);
  }
}
export const BuildPaymentService = (credentials: { key: Prisma.JsonValue }) =>
  new BookingPaymentService(credentials);
