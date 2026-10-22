import { bookingPaymentEmailLink } from "@scheduling/lib/payment/link";
import { sendAwaitingPaymentEmailAndSMS } from "@scheduling/emails/email-manager";
import { getBooking } from "@scheduling/features/bookings/lib/payment/getBooking";
import { AttendeeRepository } from "@scheduling/features/bookings/repositories/AttendeeRepository";
import { PrismaBookingPaymentRepository } from "@scheduling/features/bookings/repositories/PrismaBookingPaymentRepository";
import logger from "@scheduling/lib/logger";
import { safeStringify } from "@scheduling/lib/safeStringify";
import prisma from "@scheduling/prisma";
import { z } from "zod";

const log = logger.getSubLogger({ prefix: ["sendAwaitingPaymentEmail"] });

export const sendAwaitingPaymentEmailPayloadSchema = z.object({
  bookingId: z.number(),
  paymentId: z.number(),
  attendeeSeatId: z.string().nullable().optional(),
});

export async function sendAwaitingPaymentEmail(payload: string): Promise<void> {
  const paymentRepository = new PrismaBookingPaymentRepository();

  try {
    const { bookingId, paymentId, attendeeSeatId } = sendAwaitingPaymentEmailPayloadSchema.parse(
      JSON.parse(payload)
    );

    log.debug(`Processing sendAwaitingPaymentEmail task for bookingId ${bookingId}, paymentId ${paymentId}`);

    const { booking, evt, eventType } = await getBooking(bookingId);

    const payment = await paymentRepository.findByIdForAwaitingPaymentEmail(paymentId);

    if (!payment) {
      log.warn(`Payment ${paymentId} not found, skipping email`);
      return;
    }

    if (payment.success || booking.paid) {
      log.debug(
        `Payment ${paymentId} already succeeded or booking ${bookingId} already paid, skipping email`
      );
      return;
    }

    // filter attendees if this is for a specific seat
    let attendeesToEmail = evt.attendees;
    if (attendeeSeatId) {
      const attendeeRepository = new AttendeeRepository(prisma);
      const seatAttendees = await attendeeRepository.findByBookingIdAndSeatReference({
        bookingId,
        seatReferenceUid: attendeeSeatId,
      });
      const seatEmails = new Set(seatAttendees.map((a) => (a.email || "").toLowerCase()));
      attendeesToEmail = evt.attendees.filter((attendee) =>
        seatEmails.has((attendee.email || "").toLowerCase())
      );

      if (attendeesToEmail.length === 0) {
        log.warn(`No attendees found for seat ${attendeeSeatId} in booking ${bookingId}, skipping email`);
        return;
      }
    }

    /*
      the reason why we use the first attendee's info for the payment link is because:
      1. for regular bookings: the first attendee in the array is typically the booker (the person who made the booking and is responsible for payment)
      2. for seated events: after filtering by attendeeSeatId, there's usually only one attendee anyway
    */
    const primaryAttendee = attendeesToEmail[0];

    if (!primaryAttendee) {
      log.warn(`No attendees found for booking ${bookingId}, skipping email`);
      return;
    }

    await sendAwaitingPaymentEmailAndSMS(
      {
        ...evt,
        attendees: attendeesToEmail,
        paymentInfo: {
          link: bookingPaymentEmailLink(payment),
          paymentOption: payment.paymentOption || "ON_BOOKING",
          amount: payment.amount,
          currency: payment.currency,
        },
      },
      eventType.metadata
    );

    log.debug(`Successfully sent awaiting payment email for bookingId ${bookingId}`);
  } catch (error) {
    log.error(
      `Failed to send awaiting payment email`,
      safeStringify({ payload, error: error instanceof Error ? error.message : String(error) })
    );
    throw error;
  }
}
