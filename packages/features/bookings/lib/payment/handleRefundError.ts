import { sendOrganizerPaymentRefundFailedEmail } from "@scheduling/emails/billing-email-service";
import type { CalendarEvent } from "@scheduling/types/Calendar";

const handleRefundError = async (opts: { event: CalendarEvent; reason: string; paymentId: string }) => {
  console.error(`refund failed: ${opts.reason} for booking '${opts.event.uid}'`);
  try {
    await sendOrganizerPaymentRefundFailedEmail({
      ...opts.event,
      paymentInfo: { reason: opts.reason, id: opts.paymentId },
    });
  } catch (e) {
    console.error(e);
  }
};

export { handleRefundError };
