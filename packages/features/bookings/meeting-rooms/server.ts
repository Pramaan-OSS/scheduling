import { zonedInstant } from "@scheduling/pramaan";
import { createHash } from "node:crypto";
import prisma from "@scheduling/prisma";
import type { CalendarEvent } from "@scheduling/types/Calendar";
import { requirePramaan } from "@scheduling/pramaan";
import { ownedConnection } from "../owned-apps/server";
import { ensureRoom, deleteRoom, type RoomRecord, type RoomStore } from "./lifecycle";
import { secureUrl } from "./contracts";
export const roomId = (uid: string) => `room-${createHash("sha256").update(uid).digest("hex")}`;
export function roomStore(bookingId: number): RoomStore {
  return {
    async get(uid) { const row = await prisma.outcomeReview.findUnique({ where: { id: roomId(uid) } });
      return row ? { id: row.id, ownerId: row.userId, bookingUid: uid, signature: row.plan, status: row.status, report: (row.report || {}) as Record<string, any>, message: row.error || undefined } : null; },
    async claim(record) { try {
      const existing = await prisma.outcomeReview.findUnique({ where: { id: record.id } });
      if (existing) return (await prisma.outcomeReview.updateMany({ where: { id: record.id, status: "deleted", plan: { not: record.signature } }, data: { status: "creating", plan: record.signature, userId: record.ownerId, report: {}, options: {}, error: null } })).count === 1;
      await prisma.outcomeReview.create({ data: { id: record.id, userId: record.ownerId, bookingId, outcome: "meeting-room", input: {}, options: {}, basis: {}, estimate: {}, plan: record.signature, expiresAt: new Date("2099-01-01"), status: "creating" } }); return true; } catch { return false; } },
    async save(record) { await prisma.outcomeReview.update({ where: { id: record.id }, data: { status: record.status, report: record.report, error: record.message || null } }); },
    async claimDelete(record) { return (await prisma.outcomeReview.updateMany({ where: { id: record.id, status: "created" }, data: { status: "deleting" } })).count === 1; },
  };
}
export async function attachBookingRoom(event: CalendarEvent) {
  if (!event.uid || !event.eventTypeId) return;
  const booking = await prisma.booking.findUnique({ where: { uid: event.uid }, include: { eventType: true, payment: true } });
  const options = (booking?.eventType?.metadata as { pramaanMeetingRoom?: { enabled?: boolean; fallbackUrl?: string } } | null)?.pramaanMeetingRoom;
  if (!booking?.userId || !secureUrl(options?.fallbackUrl)) return;
  event.location = options.fallbackUrl;
  if (!options.enabled) return;
  if (booking.payment.length && !booking.payment.some(row => row.success)) return;
  const connection = await ownedConnection(booking.userId, "meetings").catch(() => null);
  if (!connection) return;
  const result = await ensureRoom(roomStore(booking.id), requirePramaan(), { hostId: booking.userId, bookingUid: booking.uid, app: connection.app, title: event.title,
    start: new Date(zonedInstant(event.startTime)).toISOString(), durationMinutes: Math.ceil((Date.parse(zonedInstant(event.endTime)) - Date.parse(event.startTime)) / 60000), timezone: event.organizer.timeZone,
    fallbackUrl: options.fallbackUrl }, process.env.SCHEDULING_ENCRYPTION_KEY || "");
  event.location = result.location;
  if (result.dialIn) event.additionalNotes = [event.additionalNotes, `Dial-in: ${result.dialIn}`].filter(Boolean).join("\n");
  await prisma.booking.update({ where: { id: booking.id }, data: { location: result.location } });
  const latest = await prisma.booking.findUnique({ where: { id: booking.id }, select: { status: true } });
  const privateRow = await prisma.outcomeReview.findUnique({ where: { id: roomId(booking.uid) } });
  if (latest?.status === "CANCELLED" || (privateRow?.options as any)?.cancelRequested) await cancelBookingRoom(event);
}
export async function cancelBookingRoom(event: CalendarEvent) {
  if (!event.uid) return;
  const row = await prisma.outcomeReview.findUnique({ where: { id: roomId(event.uid) } });
  if (!row) return;
  if (row.status === "creating") await prisma.outcomeReview.updateMany({ where: { id: row.id, status: { in: ["creating", "created"] } }, data: { options: { cancelRequested: true } } });
  const latest = await prisma.outcomeReview.findUnique({ where: { id: row.id } });
  if (latest?.status !== "created") return;
  try { await deleteRoom(roomStore(row.bookingId), requirePramaan(), event.uid); }
  catch { await prisma.outcomeReview.update({ where: { id: row.id }, data: { status: "delete_uncertain", error: "Room deletion could not be confirmed. Manage it in the connected app before further action." } }); }
}
