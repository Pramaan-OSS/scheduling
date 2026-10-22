import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { Prisma } from "@scheduling/prisma/client";
import prisma from "@scheduling/prisma";
import { requirePramaan } from "@scheduling/pramaan";
import { roomId } from "@scheduling/features/bookings/meeting-rooms/server";
import { revealHostLink, secureUrl } from "@scheduling/features/bookings/meeting-rooms/contracts";
export async function GET(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) }), uid = (await params).uid;
    const row = await prisma.outcomeReview.findUnique({ where: { id: roomId(uid) } });
    if (!row && session?.user?.id) {
      const booking = await prisma.booking.findUnique({ where: { uid }, select: { userId: true } });
      if (booking?.userId === session.user.id) return Response.json({ message: "A pasted meeting link is in use. Room creation is off or unavailable.", recordings: [] });
    }
    if (!session?.user?.id || row?.userId !== session.user.id) return Response.json({ message: "Only the room owner can access these details." }, { status: 403 });
    if (row.status === "deleted") return Response.json({ message: "Meeting room closed.", recordings: [] });
    const report = (row.report || {}) as Record<string, any>, query = new URL(request.url).searchParams;
    if (query.get("host") === "true") return Response.json({ hostUrl: report.hostCipher ? revealHostLink(report.hostCipher, process.env.SCHEDULING_ENCRYPTION_KEY || "", row.userId, uid) : null }, { headers: { "Cache-Control": "no-store" } });
    if (!report.ref) return Response.json({ message: row.error || "A pasted meeting link is in use.", recordings: [] });
    const client = requirePramaan(), endUserRef = `host_${row.userId}`;
    if (query.get("recording")) {
      if (!(report.recordingRefs || []).includes(query.get("recording"))) return Response.json({ message: "Recording was not found." }, { status: 404 });
      const recording = await client.meetingRecordingGet({ endUserRef, ref: query.get("recording")! });
      if (recording.status !== "ready" || !recording.file || !secureUrl(recording.file.url) || (!Number.isFinite(Date.parse(recording.file.expiresAt)) || Date.parse(recording.file.expiresAt) <= Date.now())) throw new Error("Storage not available.");
      return Response.json({ file: recording.file }, { headers: { "Cache-Control": "no-store" } });
    }
    const room = await client.meetingRoomGet({ endUserRef, ref: report.ref }); // Never forward the read response's private host URL.
    let recordings: Array<{ ref: string; status: string }> = [], nextCursor: string | undefined, note = "Recordings are not available yet.";
    try {
      const result = await client.meetingRecordingsList({ endUserRef, ref: report.ref, limit: 10, ...(query.get("cursor") ? { cursor: query.get("cursor")! } : {}) });
      recordings = result.results.filter(r => r.ref && r.status === "ready" && r.file && secureUrl(r.file.url) && Date.parse(r.file.expiresAt) > Date.now()).map(r => ({ ref: r.ref!, status: r.status }));
      nextCursor = result.nextCursor;
      const refs = [...new Set([...(report.recordingRefs || []), ...recordings.map(r => r.ref)])].slice(-100);
      await prisma.outcomeReview.updateMany({ where: { id: row.id, status: row.status, plan: row.plan, report: { equals: row.report as Prisma.InputJsonValue } }, data: { report: { ...report, recordingRefs: refs } } });
      if (recordings.length) note = "Recordings are available from your file storage.";
    } catch { /* The room remains usable even when file storage does not answer. */ }
    return Response.json({ message: row.error || "Room created.", status: room.status, joinUrl: report.joinUrl, dialIn: report.dialIn, hasHostLink: Boolean(report.hostCipher), recordings, nextCursor, recordingNote: note }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ message: "Meeting details or recording storage are not available yet. Use the pasted link or manage the room in your connected app." }, { status: 422 }); }
}
