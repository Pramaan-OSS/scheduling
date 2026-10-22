import { checkoutUrl, isPaymentRef } from "@scheduling/app-store/pramaan-payment/lib/gateway";
import { WEBAPP_URL } from "../constants";
export const createPaymentLink = ({ paymentUid, absolute = true }: { paymentUid: string; absolute?: boolean; [key: string]: unknown }) => `${absolute ? WEBAPP_URL : ""}/payment/${encodeURIComponent(paymentUid)}`;
export const getPremiumPlanPriceValue = () => "";
export const getPremiumMonthlyPlanPriceId = () => "";
export default async function retiredCheckout(): Promise<any> { return null; }

export function bookingPaymentEmailLink(payment: { uid: string; data?: unknown }) {
  const data = payment.data as { checkoutRef?: string; paymentLinkRef?: string; paymentUrl?: string } | null;
  // A product link survives a re-send; its status check obtains a fresh temporary payment URL.
  if (data && isPaymentRef(data.paymentLinkRef)) return createPaymentLink({ paymentUid: payment.uid });
  return data && isPaymentRef(data.checkoutRef) && checkoutUrl(data.paymentUrl) || createPaymentLink({ paymentUid: payment.uid });
}
