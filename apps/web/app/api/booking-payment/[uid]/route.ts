import { unavailableMessage } from "@scheduling/pramaan";
import { checkBookingPayment } from "@scheduling/app-store/pramaan-payment/lib/gateway";
import { handlePaymentSuccess } from "@scheduling/app-store/_utils/payments/handlePaymentSuccess";
import { distributedTracing } from "@scheduling/lib/tracing/factory";
import { HttpError } from "@scheduling/lib/http-error";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import type { Prisma } from "@scheduling/prisma/client";
import prisma from "@scheduling/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin)
    return Response.json({ message: "This request could not be verified." }, { status: 403 });
  const { uid } = await params;
  const payment = await prisma.payment.findUnique({ where: { uid }, include: { booking: true } });
  if (!payment?.booking || payment.appId !== "pramaan-payment")
    return Response.json({ message: "Payment was not found." }, { status: 404 });
  if (["CANCELLED", "REJECTED"].includes(payment.booking.status))
    return Response.json({ message: "This booking is no longer awaiting payment. Check any payment outside the product." }, { status: 422 });
  try {
    const paymentData = payment.data as { account: string; checkoutRef?: string; paymentLinkRef?: string; paymentUrl?: string };
    const result = await checkBookingPayment({ ...payment, checkoutRef: paymentData.checkoutRef, paymentLinkRef: paymentData.paymentLinkRef, paymentUrl: paymentData.paymentUrl }, paymentData.account);
    if (result.paid && result.capturedPayments.length) {
      // References are stored privately; the guest response never includes them.
      await prisma.payment.updateMany({ where: { id: payment.id, data: { equals: payment.data as Prisma.InputJsonValue } }, data: { data: {
        ...paymentData, paymentRef: result.paymentRef || null, capturedPayments: result.capturedPayments,
      } } });
    }
    if (result.paid && !payment.success) {
      // Claim the confirmation once before any notification or calendar side effect.
      const claim = await prisma.payment.updateMany({
        where: { id: payment.id, success: false },
        data: { success: true },
      });
      if (claim.count)
        await handlePaymentSuccess({
          paymentId: payment.id,
          appSlug: "pramaan-payment",
          bookingId: payment.bookingId,
          traceContext: distributedTracing.createTrace("confirm-payment"),
        }).catch(error => {
          // The shared confirmation handler signals successful completion with an HTTP result.
          if (!(error instanceof HttpError) || error.statusCode !== 200) throw error;
        });
    }
    const booking = await prisma.booking.findUnique({
      where: { id: payment.bookingId },
      select: { paid: true },
    });
    return Response.json({
      paid: result.paid, status: result.status, paymentUrl: result.paymentUrl,
      confirmed: Boolean(booking?.paid),
      ...(!paymentData.checkoutRef && !paymentData.paymentLinkRef ? { message: "This older payment cannot be checked here. Check it outside the product." } : {}),
      ...(result.paid && !booking?.paid
        ? { message: "Payment was received. Booking confirmation needs to be checked before retrying." }
        : {}),
    });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error &&
          [
            "This feature is not available yet.",
            "Add PRAMAAN_API_KEY to .env",
          ].includes(error.message)
            ? error.message
            : unavailableMessage(error),
      },
      { status: 422 }
    );
  }
}
