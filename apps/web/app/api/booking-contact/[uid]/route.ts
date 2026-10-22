import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { CONTACT_REVIEW_KIND, ContactCatalogue, connectContactAction, estimateContact, startContact, contactResult, contactFailure, type ContactAction } from "@scheduling/features/bookings/contacts/service";
import { requirePramaan, pramaanKeySet } from "@scheduling/pramaan";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import prisma from "@scheduling/prisma";
import type { Prisma } from "@scheduling/prisma/client";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
const sessions = new Map<string, { expires: number; catalogue: ContactCatalogue; choices: Map<string, ContactAction> }>();
async function context(request: Request, uid: string) {
 const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
 if (!session?.user?.id) throw new Error("Sign in first.");
 const booking = await prisma.booking.findUnique({ where: { uid }, include: { attendees: true } });
 if (!booking || (booking.userId !== session.user.id && session.user.role !== "ADMIN")) throw new Error("This booking could not be accessed.");
 const key = createHash("sha256").update(`${session.user.id}:${request.headers.get("cookie") || ""}`).digest("hex");
 for (const [id, value] of sessions) if (value.expires < Date.now()) sessions.delete(id);
 let cache = sessions.get(key);
 if (!cache) { if (sessions.size >= 100) sessions.delete(sessions.keys().next().value!); cache = { expires: Date.now() + 30 * 60_000, catalogue: new ContactCatalogue(), choices: new Map() }; sessions.set(key, cache); }
 return { user: session.user, booking, cache };
}
export async function GET(request: Request, { params }: { params: Promise<{ uid: string }> }) {
 try {
  const { user, booking } = await context(request, (await params).uid);
  const credential = await prisma.credential.findFirst({ where: { userId: user.id, type: "pramaan_contact" }, orderBy: { id: "desc" } });
  const action = credential?.key as unknown as ContactAction | undefined;
  const review = await prisma.outcomeReview.findFirst({ where: { userId: user.id, bookingId: booking.id, outcome: CONTACT_REVIEW_KIND }, orderBy: { createdAt: "desc" } });
  const attendee = booking.attendees[0];
  return Response.json({ configured: pramaanKeySet(), fields: action?.fields || [], values: { email: attendee?.email || "", name: attendee?.name || "" }, ...(review && !["ready", "reviewed"].includes(review.status) ? { reviewId: review.id, status: review.status, message: review.error || "Check the previous contact action before retrying." } : {}) });
 } catch { return Response.json({ message: "This booking could not be accessed." }, { status: 403 }); }
}
export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
 if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin) return Response.json({ message: "This request could not be verified." }, { status: 403 });
 let startedReview: string | undefined;
 try {
  const { user, booking, cache } = await context(request, (await params).uid);
  const data = await request.json();
  if (data.action === "acknowledge") {
   const review = await prisma.outcomeReview.findFirst({ where: { id: data.reviewId, userId: user.id, bookingId: booking.id, outcome: CONTACT_REVIEW_KIND } });
   if (!review || ["starting", "running"].includes(review.status)) throw new Error("Check the open action first.");
   await prisma.outcomeReview.update({ where: { id: review.id }, data: { status: "reviewed" } });
   return Response.json({});
  }
  const client = requirePramaan();
  if (data.action === "discover") {
   if (data.confirmed !== true) throw new Error("Review the search cost first.");
   const page = await cache.catalogue.page(client, data.cursor);
   const choices = page.choices.map((action: ContactAction) => { const token = createHash("sha256").update(`${action.app}:${action.action}`).digest("hex"); cache.choices.set(token, action); return { token, fields: action.fields }; });
   return Response.json({ choices, nextCursor: page.nextCursor, message: choices.length ? "Choose a contact destination." : "No compatible contact action could be checked on this page. Try another page when available." });
  }
  if (data.action === "connect") {
   const action = cache.choices.get(data.choice);
   if (!action || data.confirmed !== true) throw new Error("Review the connection's access first.");
   const connectUrl = await connectContactAction(client, user.id, action, `${WEBAPP_URL}/booking/${encodeURIComponent(booking.uid)}`);
   await prisma.credential.create({ data: { userId: user.id, type: "pramaan_contact", key: action as unknown as Prisma.InputJsonValue } });
   return Response.json({ connectUrl });
  }
  if (data.action === "estimate") {
   const open = await prisma.outcomeReview.findFirst({ where: { userId: user.id, bookingId: booking.id, outcome: CONTACT_REVIEW_KIND, status: { in: ["starting", "running", "unknown"] } } });
   if (open) throw new Error("Check the previous contact action before another estimate.");
   const credential = await prisma.credential.findFirst({ where: { userId: user.id, type: "pramaan_contact" }, orderBy: { id: "desc" } });
   if (!credential) throw new Error("Connect a contact destination first.");
   const { input, estimate } = await estimateContact(client, user.id, credential.key as unknown as ContactAction, data.values);
   const review = await prisma.outcomeReview.create({ data: { userId: user.id, bookingId: booking.id, outcome: CONTACT_REVIEW_KIND, input: input as Prisma.InputJsonValue, options: {}, basis: {}, estimate: estimate as unknown as Prisma.InputJsonValue, plan: createHash("sha256").update(JSON.stringify(input)).digest("hex"), expiresAt: new Date(Date.now()+15*60_000) } });
   return Response.json({ reviewId: review.id, input: input.input, priceMaxMicro: estimate.priceMaxMicro, priceTypicalMicro: estimate.priceTypicalMicro });
  }
  const review = await prisma.outcomeReview.findFirst({ where: { id: data.reviewId, userId: user.id, bookingId: booking.id, outcome: CONTACT_REVIEW_KIND } });
  if (!review) throw new Error("This review could not be found.");
  if (data.action === "run") {
   if (data.confirmed !== true || review.status !== "ready" || review.expiresAt.getTime() <= Date.now()) throw new Error("Review a fresh estimate before starting this action.");
   const claim = await prisma.outcomeReview.updateMany({ where: { id: review.id, status: "ready" }, data: { status: "starting", startedAt: new Date() } });
   if (!claim.count) throw new Error("This action already started. Check its status.");
   startedReview = review.id;
   const result = await startContact(client, review.input, review.estimate as unknown as { priceMaxMicro: number }, review.id) as any;
   if (result?.id && result.status === "running") { await prisma.outcomeReview.update({ where: { id: review.id }, data: { jobId: result.id, status: "running" } }); return Response.json({ status: "running", message: "The contact action is working. Check its status." }); }
   const view = contactResult(result);
   await prisma.outcomeReview.update({ where: { id: review.id }, data: { status: view.status, error: view.message } });
   return Response.json(view);
  }
  if (data.action === "status") {
   if (review.status === "running" && review.jobId) {
    if (review.startedAt && Date.now()-review.startedAt.getTime()>35*60_000) { await prisma.outcomeReview.update({ where: { id: review.id }, data: { status: "unknown", error: "This action timed out. Check the destination before retrying." } }); return Response.json({ status: "unknown", message: "Check the destination before retrying." }); }
    const job = await client.jobs.get(review.jobId);
    if (job.status === "running") return Response.json({ status: "running", message: "The action is working or waiting its turn." });
    const view = job.status === "done" ? contactResult(job.result) : { status: "failed", message: "This action failed. Check the destination before retrying." };
    await prisma.outcomeReview.update({ where: { id: review.id }, data: { status: view.status, error: view.message } });
    return Response.json(view);
   }
   return Response.json({ status: review.status, message: review.error || "Check this action before retrying." });
  }
  throw new Error("Choose an available contact action.");
 } catch (error) {
  if (startedReview) await prisma.outcomeReview.update({ where: { id: startedReview }, data: { status: "unknown", error: "Could not confirm this action. Check the destination before retrying." } });
  const known = error instanceof Error && /^(Enter |Check |Connect |Review |Fill |Choose |Start |This action |This review |This booking |Sign in |No compatible)/.test(error.message);
  return Response.json({ message: known ? (error as Error).message : contactFailure(error) }, { status: 422 });
 }
}
