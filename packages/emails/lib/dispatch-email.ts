import { createHash } from "node:crypto";
import { requirePramaan, unavailableMessage, type Pramaan, type Caps, PramaanError } from "@scheduling/pramaan";
import { calendarLink } from "./calendar-link";

type Options = { origin: string; secret: string };
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
}
function address(value: unknown): string {
  if (typeof value !== "string") throw new Error("An email address is required.");
  const match = value.match(/<([^<>]+)>\s*$/);
  const result = (match?.[1] || value).trim();
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(result)) throw new Error("An email address is invalid.");
  return result;
}
function addresses(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value]).map(address);
}
export function prepareEmail(payload: Record<string, unknown>, options: Options, fallback = false): Caps.EmailSendRequest {
  let text = typeof payload.text === "string" ? payload.text : "";
  let html = typeof payload.html === "string" ? payload.html : "";
  const calendar = payload.icalEvent as { content?: string; invitation?: Omit<Caps.EmailInvitation, "organiser" | "attendees"> } | undefined;
  if (calendar?.content && !calendar.invitation && !fallback)
    throw new Error("Booking email needs calendar invitation details.");
  if (calendar?.content) {
    const url = fallback ? calendarLink(calendar.content, options.origin, options.secret) : undefined;
    const details = calendar.content.replace(/\r?\n[ \t]/g, "").split(/\r?\n/)
      .filter(line => /^(SUMMARY|DTSTART|DTEND|LOCATION|STATUS)[;:]/.test(line)).join("\n");
    text += `\n\nCalendar details:\n${details}${url ? `\n\nAdd to calendar: ${url}` : ""}`;
    html += `<p>Calendar details:</p><pre>${escapeHtml(details)}</pre>${url ? `<p><a href="${escapeHtml(url)}">Add to calendar</a></p>` : ""}`;
  }
  const attachments = payload.attachments as Caps.EmailSendRequest["attachments"];
  if (attachments?.some(file => !file.fileId || !file.name))
    throw new Error("Email attachments need uploaded file identifiers and names.");
  if (typeof payload.subject !== "string" || !payload.subject) throw new Error("An email subject is required.");
  if (!text && !html) throw new Error("An email body is required.");
  const replyTo = typeof payload.replyTo === "string" ? payload.replyTo.split(",").at(-1)?.trim() : undefined;
  return {
    ...(calendar?.invitation && !fallback ? { invitation: {
      ...calendar.invitation, organiser: address(payload.from),
      attendees: [...new Set([...addresses(payload.to), ...(payload.cc ? addresses(payload.cc) : [])])],
    } } : {}),
    ...(attachments?.length ? { attachments } : {}),
    from: String(payload.from || ""), to: addresses(payload.to), subject: payload.subject,
    ...(text ? { text } : {}), ...(html ? { html } : {}),
    ...(payload.cc ? { cc: addresses(payload.cc) } : {}), ...(payload.bcc ? { bcc: addresses(payload.bcc) } : {}),
    ...(replyTo ? { replyTo: address(replyTo) } : {}),
  };
}
export async function dispatchEmail(payload: Record<string, unknown>, options: Options, client?: Pramaan) {
  // Stable identity precedes the randomized calendar link: an uncertain send keeps its identity.
  const idempotencyKey = `email-${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
  try {
    const sender = client || requirePramaan();
    const input = prepareEmail(payload, options);
    let result: Caps.EmailSendResult;
    try {
      result = await sender.emailSend(input, { idempotencyKey });
    } catch (error) {
      // Only a definite refusal allows the link-only variant. Lost answers and jobs stay uncertain.
      const refused = error instanceof PramaanError && !error.jobId &&
        (error.code === "upstream_unavailable" ||
          (error.code === "invalid_request" && /invitation/i.test(error.message) &&
            /unknown|unrecognized|unexpected|unsupported|not (?:allowed|supported)|refused/i.test(error.message)));
      if (!input.invitation || !refused) throw error;
      result = await sender.emailSend(prepareEmail(payload, options, true), { idempotencyKey: `${idempotencyKey}-calendar-link` });
    }
    if (result.status !== "queued" && result.status !== "sent") throw new Error("Unconfirmed email result.");
    return result;
  } catch (error) {
    throw new Error(unavailableMessage(error));
  }
}
