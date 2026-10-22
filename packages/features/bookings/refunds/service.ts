import { Cap, PramaanError, requirePramaan, type Pramaan } from "@scheduling/pramaan";
import { isPaymentRef } from "@scheduling/app-store/pramaan-payment/lib/gateway";

export const OUTSIDE_REFUND = "Refund this payment outside the product.";
export type RefundPayment = { id: number; bookingHostId: number | null; success: boolean; refunded: boolean; amount: number; currency: string; data: Record<string, any> };
export interface RefundStore {
  get(paymentId: number): Promise<RefundPayment | null>;
  claim(payment: RefundPayment, data: Record<string, any>): Promise<boolean>;
  finish(paymentId: number, requestId: string, data: Record<string, any>, fullyRefunded: boolean): Promise<void>;
}
export function refundAvailability(payment: RefundPayment) {
  if (payment.data.refund && payment.data.refund.status !== "succeeded")
    return { available: false, message: payment.data.refund.message || "A refund was already requested. Check its status before taking further action." };
  if (payment.refunded) return { available: false, message: "This payment is refunded." };
  if (!payment.success || !isPaymentRef(payment.data.paymentRef)) return { available: false, message: OUTSIDE_REFUND };
  return { available: true, message: "Review the amount and confirm approval before requesting a refund." };
}
export async function requestBookingRefund(store: RefundStore,
  input: { paymentId: number; hostId: number; requestId: string; approved: boolean; amount?: number }, client?: Pramaan) {
  const payment = await store.get(input.paymentId);
  if (!payment || payment.bookingHostId !== input.hostId) throw new Error("Only the booking host can refund this payment.");
  if (!input.approved) throw new Error("Review and approve this refund first.");
  if (!/^[0-9a-f-]{36}$/i.test(input.requestId)) throw new Error("A refund request identifier is required.");
  if (payment.data.refund?.requestId === input.requestId)
    return { status: payment.data.refund.status, message: payment.data.refund.message || "Check the previous refund request before retrying." };
  const availability = refundAvailability(payment);
  if (!availability.available) return { status: "blocked", message: availability.message };
  const remaining = payment.amount - (payment.data.refundedAmount || 0);
  const amount = input.amount ?? remaining;
  if (!Number.isInteger(amount) || amount < 1 || amount > remaining || amount > 99999999)
    throw new Error("Enter a refund amount within the remaining payment, in whole minor units.");
  // After a partial refund, use an amount refund for the balance rather than reverse the original total.
  const partial = amount !== payment.amount;
  const identity = `booking-refund-${payment.id}-${input.requestId}`;
  const data = { ...payment.data, refund: { requestId: input.requestId, amount, status: "starting", approvedBy: input.hostId, approvedAt: new Date().toISOString() } };
  if (!await store.claim(payment, data)) return { status: "blocked", message: "Another refund request is already being checked." };
  let status: string, message: string;
  try {
    const result = await (client || requirePramaan()).call(partial ? Cap.billingRefundCreate : Cap.paymentsPaymentReverse,
      { ref: payment.data.paymentRef, ...(partial ? { amount: { amount, currency: payment.currency.toUpperCase() } } : {}) },
      { idempotencyKey: identity }) as { status?: string; amount?: { amount: number; currency: string } };
    status = result.status || "unknown";
    if (partial && status === "succeeded" && result.amount &&
        (result.amount.amount !== amount || result.amount.currency.toUpperCase() !== payment.currency.toUpperCase())) status = "unknown";
    if (!partial && status === "succeeded") status = "unknown"; // reversal receipts cannot confirm completion
    message = status === "succeeded" ? "Refund confirmed." : status === "pending" ?
      "Refund requested. Completion is not confirmed; check the payment before taking further action." :
      status === "failed" ? OUTSIDE_REFUND : "The refund result is uncertain. Check its status before taking further action.";
    if (!["succeeded", "pending", "failed"].includes(status)) status = "uncertain";
  } catch (error) {
    const refused = error instanceof PramaanError && !error.jobId && (error.code === "invalid_request" ||
      (error.code === "upstream_unavailable" && !error.retryable));
    status = refused ? "unavailable" : "uncertain";
    message = refused ? OUTSIDE_REFUND : "The refund may already have been requested. Check its status before taking further action.";
  }
  const refundedAmount = (payment.data.refundedAmount || 0) + (status === "succeeded" ? amount : 0);
  await store.finish(payment.id, input.requestId, { ...data, refundedAmount, refund: { ...data.refund, status, message } }, refundedAmount === payment.amount);
  return { status, message };
}
