import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import prisma from "@scheduling/prisma";
import type { Prisma } from "@scheduling/prisma/client";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { pramaanKeySet } from "@scheduling/pramaan";
import { refundAvailability, requestBookingRefund, type RefundPayment, type RefundStore } from "@scheduling/features/bookings/refunds/service";
async function context(uid: string) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) throw new Error("Sign in first.");
  const booking = await prisma.booking.findUnique({ where: { uid }, include: { payment: true } });
  if (!booking || booking.userId !== session.user.id) throw new Error("Only the booking host can refund this payment.");
  return { hostId: session.user.id, booking };
}
export async function GET(_request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { booking } = await context((await params).uid);
    return Response.json({ payments: booking.payment.filter(p => p.appId === "pramaan-payment").map(p => {
      const payment = { ...p, bookingHostId: booking.userId, data: p.data as Record<string, any> };
      const availability = refundAvailability(payment);
      return { id: p.id, amount: p.amount - (payment.data.refundedAmount || 0), currency: p.currency,
        ...availability, ...(!pramaanKeySet() && availability.available ? { available: false, message: "Add PRAMAAN_API_KEY to .env" } : {}) };
    }) });
  } catch { return Response.json({ message: "Only the booking host can access refunds." }, { status: 403 }); }
}
export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin) return Response.json({ message: "This request could not be verified." }, { status: 403 });
  try {
    const { hostId, booking } = await context((await params).uid);
    const input = await request.json();
    if (!Number.isInteger(input.paymentId) || !booking.payment.some(p => p.id === input.paymentId && p.appId === "pramaan-payment"))
      return Response.json({ message: "Payment was not found." }, { status: 404 });
    if (!pramaanKeySet()) return Response.json({ message: "Add PRAMAAN_API_KEY to .env" }, { status: 422 });
    const store: RefundStore = {
      async get(id) { const p = await prisma.payment.findUnique({ where: { id }, include: { booking: { select: { userId: true } } } });
        return p ? { ...p, bookingHostId: p.booking?.userId ?? null, data: p.data as Record<string, any> } as RefundPayment : null; },
      async claim(p, data) { return (await prisma.payment.updateMany({ where: { id: p.id, success: true, booking: { userId: hostId }, data: { equals: p.data as Prisma.InputJsonValue } }, data: { data: data as Prisma.InputJsonValue } })).count === 1; },
      async finish(id, requestId, data, fullyRefunded) { const saved = await prisma.payment.updateMany({ where: { id, data: { path: ["refund", "requestId"], equals: requestId } }, data: { data: data as Prisma.InputJsonValue, ...(fullyRefunded ? { refunded: true } : {}) } }); if (saved.count !== 1) throw new Error("Check this refund request before further action."); },
    };
    return Response.json(await requestBookingRefund(store, { paymentId: input.paymentId, hostId, requestId: input.requestId, approved: input.approved === true, amount: input.amount }));
  } catch { return Response.json({ message: "The refund could not be completed. Check any existing request before trying again." }, { status: 422 }); }
}
