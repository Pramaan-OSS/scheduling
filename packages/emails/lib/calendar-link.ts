import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const MAX_BYTES = 100_000;
function key(secret: string) {
  if (!secret) throw new Error("Set the application session secret before sending calendar links.");
  return createHash("sha256").update(`calendar-file:${secret}`).digest();
}
export function calendarLink(content: string, origin: string, secret: string, now = Date.now()) {
  if (Buffer.byteLength(content) > MAX_BYTES) throw new Error("The calendar file is too large.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const bytes = Buffer.concat([cipher.update(JSON.stringify({ content, expires: now + 30 * 86400_000 })), cipher.final()]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64url");
  const url = new URL("/api/calendar-file", origin);
  url.searchParams.set("token", token);
  return url.toString();
}
export function readCalendarLink(token: string, secret: string, now = Date.now()): string {
  if (token.length > MAX_BYTES * 2) throw new Error("Calendar link is invalid or expired.");
  const bytes = Buffer.from(token, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  const data = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
  if (typeof data.content !== "string" || !Number.isFinite(data.expires) || data.expires <= now)
    throw new Error("Calendar link is invalid or expired.");
  return data.content;
}
