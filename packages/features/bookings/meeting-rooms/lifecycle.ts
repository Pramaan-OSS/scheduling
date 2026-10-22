import { createHash } from "node:crypto";
import { PramaanError, type Pramaan } from "@scheduling/pramaan";
import { supportsFallback } from "@scheduling/app-store/pramaan-calendar/lib/availability";
import { createRoom } from "./contracts";
export type RoomRecord = { id: string; ownerId: number; bookingUid: string; signature: string; status: string; report: Record<string, any>; message?: string };
export interface RoomStore { get(uid: string): Promise<RoomRecord | null>; claim(record: RoomRecord): Promise<boolean>; save(record: RoomRecord): Promise<void>; claimDelete(record: RoomRecord): Promise<boolean>; }
export type RoomInput = { hostId: number; bookingUid: string; app: string; title: string; start: string; durationMinutes: number; timezone: string; fallbackUrl: string };
export async function ensureRoom(store: RoomStore, client: Pramaan, input: RoomInput, secret: string) {
  const signature = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const existing = await store.get(input.bookingUid);
  if (existing && !(existing.status === "deleted" && existing.signature !== signature)) {
    if (existing.status === "created" && existing.signature === signature) return { location: existing.report.joinUrl, message: "" };
    if (existing.status === "created") await store.save({ ...existing, message: "The booking changed. Manage the existing room in your connected app; the pasted link is used." });
    return { location: input.fallbackUrl, message: existing.message || "The pasted meeting link is being used. Check any previous room request before further action." };
  }
  const record: RoomRecord = { id: `room-${createHash("sha256").update(input.bookingUid).digest("hex")}`, ownerId: input.hostId, bookingUid: input.bookingUid, signature, status: "creating", report: {} };
  if (!await store.claim(record)) return { location: input.fallbackUrl, message: "Room creation is already being checked. The pasted link is used." };
  try {
    const report = await createRoom(client, input, secret);
    await store.save({ ...record, status: "created", report });
    return { location: report.joinUrl, dialIn: report.dialIn, message: "" };
  } catch (error) {
    const unavailable = supportsFallback(error) && error instanceof PramaanError && !error.retryable && !error.jobId;
    const message = unavailable ? "Meeting rooms are not available yet on this connection. The pasted link is used." : "Room creation could not be confirmed. The pasted link is used; check the connected app before further action.";
    await store.save({ ...record, status: unavailable ? "fallback" : "uncertain", message });
    return { location: input.fallbackUrl, message };
  }
}
export async function deleteRoom(store: RoomStore, client: Pramaan, uid: string) {
  const record = await store.get(uid);
  if (!record || !record.report.ref || record.status !== "created" || !await store.claimDelete(record)) return;
  try {
    const result = await client.meetingRoomDelete({ endUserRef: `host_${record.ownerId}`, ref: record.report.ref }, { idempotencyKey: `${record.id}-delete-${createHash("sha256").update(record.report.ref).digest("hex")}` });
    if (result.deleted !== true) throw new Error("Deletion not confirmed.");
    await store.save({ ...record, status: "deleted", report: { ...record.report, hostCipher: null }, message: "Meeting room deleted." });
  } catch { await store.save({ ...record, status: "delete_uncertain", message: "Room deletion could not be confirmed. Manage it in the connected app before further action." }); }
}
