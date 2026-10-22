import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { Cap, type Pramaan } from "@scheduling/pramaan";
export function secureUrl(value: unknown): value is string {
  try { const url = new URL(String(value)); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
function key(secret: string) { if (Buffer.byteLength(secret) !== 32) throw new Error("Configure private-link encryption before enabling meeting rooms."); return createHash("sha256").update(secret).digest(); }
export function protectHostLink(url: string, secret: string, owner: number, booking: string) {
  if (!secureUrl(url)) throw new Error("The private meeting link could not be confirmed.");
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(`${owner}:${booking}`));
  const content = Buffer.concat([cipher.update(url, "utf8"), cipher.final()]);
  return JSON.stringify({ iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex"), content: content.toString("base64") });
}
export function revealHostLink(value: string, secret: string, owner: number, booking: string) {
  const envelope = JSON.parse(value); const cipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(envelope.iv, "hex"));
  cipher.setAAD(Buffer.from(`${owner}:${booking}`)); cipher.setAuthTag(Buffer.from(envelope.tag, "hex"));
  return Buffer.concat([cipher.update(Buffer.from(envelope.content, "base64")), cipher.final()]).toString("utf8");
}
export async function createRoom(client: Pramaan, input: { hostId: number; bookingUid: string; app: string; title: string; start: string; durationMinutes: number; timezone: string }, secret: string) {
  key(secret); // Check storage before asking for a sensitive link that may be returned only once.
  const result = await client.meetingRoomCreate({ endUserRef: `host_${input.hostId}`, app: input.app, title: input.title,
    start: input.start, durationMinutes: input.durationMinutes, timezone: input.timezone, waitingRoom: true, recording: "none" },
    { idempotencyKey: `meeting-${createHash("sha256").update(JSON.stringify(input)).digest("hex")}` });
  if (!secureUrl(result.joinUrl) || !result.ref) throw new Error("Room creation could not be confirmed. Use the pasted link and check the connected app.");
  return { joinUrl: result.joinUrl, ref: result.ref, ...(result.dialIn ? { dialIn: result.dialIn } : {}),
    ...(result.hostUrl ? { hostCipher: protectHostLink(result.hostUrl, secret, input.hostId, input.bookingUid) } : {}) };
}
