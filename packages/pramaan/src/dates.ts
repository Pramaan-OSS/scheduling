/** Instants must carry their own offset; never interpret a booking in the server's local zone. */
export function zonedInstant(value: unknown, path = "time"): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new Error(`${path} must include a four-digit year and an explicit time-zone offset.`);
  return value;
}

export function validateOutgoingDates(id: string, input: unknown): void {
  if (!input || typeof input !== "object") return;
  const row = input as Record<string, unknown>;
  const fields = id.startsWith("calendar.") ? ["start", "end", "after", "before", "startAt", "endAt"]
    : id === "meetings.room.create" ? ["start"]
    : id === "payments.payment-link.create" || id === "links.short.create" || id === "links.short.update" ? ["expiresAt"] : [];
  for (const field of fields) if (row[field] !== undefined && row[field] !== null) zonedInstant(row[field], `${id}.${field}`);
  if (id === "email.send" && row.invitation && typeof row.invitation === "object") {
    const invitation = row.invitation as Record<string, unknown>;
    zonedInstant(invitation.start, "email.send.invitation.start");
    zonedInstant(invitation.end, "email.send.invitation.end");
  }
}
