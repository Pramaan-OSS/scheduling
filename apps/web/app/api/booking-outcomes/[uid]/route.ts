import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import {
  BOOKING_OUTCOMES,
  estimateBookingOutcome,
  startBookingOutcome,
  inspectBookingOutcome,
  reportView,
  type BookingOutcome,
} from "@scheduling/features/bookings/outcomes/service";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import { serverConfig } from "@scheduling/lib/serverConfig";
import prisma from "@scheduling/prisma";
import type { Prisma } from "@scheduling/prisma/client";
import {
  requirePramaan,
  pramaanKeySet,
  unavailableMessage,
  PramaanError,
  type OutcomeEstimate,
  type OutcomeRun,
  type OutcomeRunOptions,
} from "@scheduling/pramaan";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin)
    return Response.json({ message: "This request could not be verified." }, { status: 403 });
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) return Response.json({ message: "Sign in first." }, { status: 401 });
  const booking = await prisma.booking.findUnique({
    where: { uid: (await params).uid },
    include: { attendees: true },
  });
  if (!booking || (booking.userId !== session.user.id && session.user.role !== "ADMIN"))
    return Response.json({ message: "This booking could not be accessed." }, { status: 403 });
  let activeReview: string | undefined;
  try {
    const data = await request.json();
    if (data.action === "acknowledge") {
      const review = await prisma.outcomeReview.findFirst({ where: { id: data.reviewId, userId: session.user.id, bookingId: booking.id } });
      if (!review || ["running", "starting"].includes(review.status)) return Response.json({ message: "Check the open run first." }, { status: 409 });
      await prisma.outcomeReview.update({ where: { id: review.id }, data: { status: "reviewed" } });
      return Response.json({ status: "reviewed" });
    }
    const client = requirePramaan();
    if (data.action === "estimate") {
      const open = await prisma.outcomeReview.findFirst({ where: { userId: session.user.id, bookingId: booking.id, outcome: { not: "meeting-room" }, status: { in: ["running", "starting", "unknown"] } } });
      if (open) return Response.json({ message: "Check the previous run before reviewing another estimate." }, { status: 409 });
      if (
        !BOOKING_OUTCOMES.includes(data.outcome) ||
        !["consent", "contract", "legitimate_interest"].includes(data.ground)
      )
        return Response.json({ message: "Choose an action and its basis." }, { status: 400 });
      const id = data.outcome as BookingOutcome;
      const attendee =
        booking.attendees.find((person) => person.email === data.email) || booking.attendees[0];
      if (!attendee)
        return Response.json({ message: "This booking has no attendee to look up." }, { status: 400 });
      let input: Record<string, unknown>;
      if (id === "lead.enrich") input = { email: attendee.email };
      else if (id === "notify.send") {
        if (typeof data.message !== "string" || !data.message.trim() || data.message.length > 1600)
          return Response.json({ message: "Write a message of at most 1600 characters." }, { status: 400 });
        input = {
          email: attendee.email,
          from: serverConfig.from,
          subject: booking.title,
          message: data.message,
        };
      } else {
        if (typeof data.domain !== "string" || !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(data.domain))
          return Response.json({ message: "Enter the company website domain." }, { status: 400 });
        input =
          id === "meeting.brief"
            ? {
                domain: data.domain,
                email: attendee.email,
                ...(attendee.name ? { personName: attendee.name } : {}),
              }
            : { domain: data.domain, criteria: data.criteria };
        if (
          id === "lead.qualify" &&
          (!Array.isArray(data.criteria) ||
            !data.criteria.length ||
            data.criteria.length > 8 ||
            data.criteria.some(
              (text: unknown) => typeof text !== "string" || !text.trim() || text.length > 300
            ))
        )
          return Response.json(
            { message: "Enter one to eight criteria, at most 300 characters each." },
            { status: 400 }
          );
      }
      const basis = { ground: data.ground };
      const estimate = await estimateBookingOutcome(client, id, input, { basis, options: {} });
      const review = await prisma.outcomeReview.create({
        data: {
          userId: session.user.id,
          bookingId: booking.id,
          outcome: id,
          input: input as Prisma.InputJsonValue,
          options: {},
          basis,
          estimate: estimate as unknown as Prisma.InputJsonValue,
          plan: estimate.plan,
          expiresAt: new Date(Date.now() + 15 * 60_000),
        },
      });
      return Response.json({
        reviewId: review.id,
        estimate: {
          priceMinMicro: estimate.priceMinMicro,
          priceMaxMicro: estimate.priceMaxMicro,
          priceTypicalMicro: estimate.priceTypicalMicro,
          steps: estimate.steps.map((step) =>
            step.capability === "email.send"
              ? "Send email"
              : step.capability.startsWith("email.")
                ? "Check delivery"
                : step.capability.startsWith("companies.")
                  ? "Read company information"
                  : step.capability.startsWith("people.") || step.capability.startsWith("linkedin.")
                    ? "Read public profile information"
                    : step.capability.startsWith("llm.")
                      ? "Prepare a checked result"
                      : "Check the requested source"
          ),
        },
        input,
        ground: basis.ground,
      });
    }
    const review = await prisma.outcomeReview.findFirst({
      where: { id: data.reviewId, userId: session.user.id, bookingId: booking.id, outcome: { not: "meeting-room" } },
    });
    if (!review) return Response.json({ message: "This review could not be found." }, { status: 404 });
    if (data.action === "run") {
      if (data.confirmed !== true || review.status !== "ready")
        return Response.json(
          {
            message:
              "This run was already started or has not been approved. Check its status before retrying.",
          },
          { status: 409 }
        );
      if (review.expiresAt.getTime() <= Date.now())
        return Response.json({ message: "The estimate expired. Review a fresh estimate." }, { status: 409 });
      const claim = await prisma.outcomeReview.updateMany({
        where: { id: review.id, status: "ready" },
        data: { status: "starting", startedAt: new Date() },
      });
      if (!claim.count) return Response.json({ message: "This run has already started." }, { status: 409 });
      activeReview = review.id;
      const started = await startBookingOutcome(
        client,
        review.outcome as BookingOutcome,
        review.input,
        {
          options: review.options as Record<string, unknown>,
          basis: review.basis as unknown as OutcomeRunOptions["basis"],
        },
        review.estimate as unknown as OutcomeEstimate,
        `booking-outcome-${review.id}`
      );
      if ("id" in started) {
        await prisma.outcomeReview.update({
          where: { id: review.id },
          data: { jobId: started.id, status: "running" },
        });
        return Response.json({ configured: pramaanKeySet(), reviewId: review.id, status: "running" });
      }
      await prisma.outcomeReview.update({
        where: { id: review.id },
        data: { status: started.status, report: started as unknown as Prisma.InputJsonValue },
      });
      return Response.json({ configured: pramaanKeySet(), reviewId: review.id, ...reportView(started) });
    }
    if (["status", "cancel"].includes(data.action)) {
      if (review.jobId && review.startedAt && ["running", "starting"].includes(review.status)) {
        const result = await inspectBookingOutcome(
          client,
          review.jobId,
          review.startedAt.getTime(),
          data.action === "cancel"
        );
        await prisma.outcomeReview.update({
          where: { id: review.id },
          data: {
            status: result.status,
            ...("report" in result ? { report: result.report as unknown as Prisma.InputJsonValue } : {}),
            ...("error" in result ? { error: result.error } : {}),
          },
        });
        return Response.json({
          reviewId: review.id,
          ...("report" in result
            ? reportView(result.report!)
            : {
                status: result.status,
                message: "error" in result ? result.error : "The run is working or waiting its turn.",
              }),
        });
      }
      return Response.json({
        reviewId: review.id,
        ...(review.report
          ? reportView(review.report as unknown as OutcomeRun)
          : { status: review.status, message: review.error || "Check what happened before retrying." }),
      });
    }
    return Response.json({ message: "Choose an available action." }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof PramaanError && error.code === "rate_limited"
        ? "Too many runs are open. Try later."
        : error instanceof PramaanError && [403, 409].includes(error.status || 0)
          ? "This approval is no longer valid. Review a fresh estimate."
          : unavailableMessage(error);
    if (activeReview)
      await prisma.outcomeReview.update({
        where: { id: activeReview },
        data: {
          status:
            error instanceof PramaanError && [403, 409, 429, 502].includes(error.status || 0)
              ? "failed"
              : "unknown",
          error: message,
        },
      });
    return Response.json(
      { message },
      {
        status:
          error instanceof PramaanError && [403, 409, 429].includes(error.status || 0) ? error.status : 422,
      }
    );
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ uid: string }> }) {
 const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
 if (!session?.user?.id) return Response.json({ message: "Sign in first." }, { status: 401 });
 const booking = await prisma.booking.findUnique({ where: { uid: (await params).uid } });
 if (!booking || (booking.userId !== session.user.id && session.user.role !== "ADMIN")) return Response.json({ message: "This booking could not be accessed." }, { status: 403 });
 const review = await prisma.outcomeReview.findFirst({ where: { userId: session.user.id, bookingId: booking.id, outcome: { not: "meeting-room" } }, orderBy: { createdAt: "desc" } });
 if (!review || ["ready", "reviewed"].includes(review.status)) return Response.json({ configured: pramaanKeySet() });
 return Response.json({ configured: pramaanKeySet(), reviewId: review.id, ...(review.report ? reportView(review.report as unknown as OutcomeRun) : { status: review.status, message: review.error || "Check this run before retrying." }) });
}
