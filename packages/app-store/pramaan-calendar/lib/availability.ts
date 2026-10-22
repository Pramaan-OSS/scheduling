import { Cap, zonedInstant, PramaanError, busyIntervals, type Pramaan } from "@scheduling/pramaan";
export const CANNOT_CONFIRM = "Cannot confirm availability. Check your calendar connection and selected calendars.";
export function supportsFallback(error: unknown) {
  return error instanceof PramaanError && !/too large|too many|incomplete|limit.*exceed/i.test(error.message) &&
    (["upstream_unavailable", "connection_required", "not_found"].includes(error.code) ||
      error.code === "invalid_request" && /unknown|unsupported|unrecognized|unexpected|not (?:allowed|supported)|refused/i.test(error.message));
}
export async function calendarChoices(client: Pramaan, inbox: string) {
  const rows: Array<{ name: string; isPrimary?: boolean; readOnly?: boolean }> = [];
  let cursor: string | undefined; const seen = new Set<string>();
  for (let page = 0; page < 20; page++) {
    const result = await client.call(Cap.calendarCalendarsList, { inbox, limit: 50, ...(cursor ? { cursor } : {}) }) as { results?: typeof rows; nextCursor?: string };
    if (!Array.isArray(result.results) || result.results.some(row => !row.name)) throw new Error(CANNOT_CONFIRM);
    rows.push(...result.results); cursor = result.nextCursor;
    if (!cursor) { if (new Set(rows.map(row => row.name)).size !== rows.length) throw new Error("Calendar names must be unique before they can be selected."); return rows; }
    if (seen.has(cursor)) break; seen.add(cursor);
  }
  throw new Error(CANNOT_CONFIRM);
}
export async function checkedAvailability(client: Pramaan, input: { inbox: string; names?: string[]; start: string; end: string; timezone: string }) {
  const start = Date.parse(zonedInstant(input.start)), end = Date.parse(zonedInstant(input.end));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 366 * 86400_000) throw new Error(CANNOT_CONFIRM);
  const names = input.names || [];
  if (names.length > 20 || new Set(names).size !== names.length) throw new Error(CANNOT_CONFIRM);
  const calendars = names.length ? names.map(calendarName => ({ inbox: input.inbox, calendarName })) : [{ inbox: input.inbox }];
  const busy: Array<{ start: string; end: string }> = [];
  try {
    for (let from = start; from < end; from += 62 * 86400_000) {
      const until = Math.min(end, from + 62 * 86400_000);
      const result = await client.calendarFreeBusy({ calendars, after: new Date(from).toISOString(), before: new Date(until).toISOString(), timezone: input.timezone });
      if (!Array.isArray(result.results) || result.results.length !== calendars.length) throw new Error(CANNOT_CONFIRM);
      for (const [index, row] of result.results.entries()) {
        if (row.calendar !== index || !Array.isArray(row.busy)) throw new Error(CANNOT_CONFIRM);
        for (const interval of row.busy) {
          const a = Date.parse(interval.start), b = Date.parse(interval.end);
          if (!/Z$/.test(interval.start) || !/Z$/.test(interval.end) || !Number.isFinite(a) || !Number.isFinite(b) || a < from || b > until || b <= a) throw new Error(CANNOT_CONFIRM);
          busy.push(interval);
        }
      }
    }
    return busy;
  } catch (error) {
    if (supportsFallback(error)) {
      // The old agenda path cannot name additional calendars. Never silently drop them.
      if (names.length) {
        const rows = await calendarChoices(client, input.inbox).catch(() => { throw new Error(CANNOT_CONFIRM); });
        const primary = rows.find(row => row.isPrimary) || (rows.length === 1 ? rows[0] : undefined);
        if (names.length !== 1 || names[0] !== primary?.name) throw new Error(CANNOT_CONFIRM);
      }
      try { return await busyIntervals(client, { inbox: input.inbox, startAt: input.start, endAt: input.end }); }
      catch { throw new Error(CANNOT_CONFIRM); }
    }
    throw new Error(CANNOT_CONFIRM);
  }
}
