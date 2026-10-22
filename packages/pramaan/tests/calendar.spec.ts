import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, busyIntervals, PramaanError } from "../src/index";
import { PrimaryCalendar } from "../../app-store/pramaan-calendar/lib/CalendarService";
const window = { inbox: "fixture@example.test", startAt: "2026-01-01T00:00:00Z", endAt: "2026-01-02T00:00:00Z" };
const event = { uid: "booking-fixture", title: "Visit", startTime: "2026-01-01T10:00:00Z", endTime: "2026-01-01T11:00:00Z", location: "https://meeting.example.test/join", calendarDescription: "Booking", attendees: [{ email: "guest@example.test", name: "Guest" }] } as any;
function service(fake: FakePramaan) { return new PrimaryCalendar({ id: 1, key: { inbox: window.inbox } } as any, fake); }

test("calendar create, update and delete use inbox, handles, UTC and free-text location", async () => {
  const fake = new FakePramaan({ [Cap.calendarEventCreate]: () => ({ ref: "ref_fixture" }), [Cap.calendarEventUpdate]: () => ({ kind: "single" }), [Cap.calendarEventDelete]: () => ({ deleted: true }) });
  const calendar = service(fake);
  expect((await calendar.createEvent(event)).id).toBe("ref_fixture");
  await calendar.updateEvent("ref_fixture", event);
  await calendar.deleteEvent("ref_fixture", event);
  expect(fake.calls[0]!.input).toMatchObject({ inbox: window.inbox, timezone: "UTC", start: "2026-01-01T10:00:00.000Z", location: event.location, sendInvites: false });
  expect(fake.calls[1]!.input).toHaveProperty("ref", "ref_fixture");
  expect(fake.calls[1]!.input).toHaveProperty("title", event.title);
  expect(fake.calls[2]!.input).toEqual({ inbox: window.inbox, ref: "ref_fixture", sendInvites: false });
  for (const call of fake.calls) expect(call.opts?.idempotencyKey).toBeTruthy();
});
test("agenda follows cursors and uses actual UTC busy instants", async () => {
  const fake = new FakePramaan({ [Cap.calendarAgendaGet]: (input: any) => input.cursor ? ({ results: [{ startAt: "2026-01-01T10:00:00Z", endAt: "2026-01-01T11:00:00Z", start: "wrong wall time" }] }) : ({ results: [], nextCursor: "next" }) });
  expect(await busyIntervals(fake, window)).toEqual([{ start: "2026-01-01T10:00:00Z", end: "2026-01-01T11:00:00Z" }]);
  expect(fake.calls[0]!.input).toMatchObject({ inbox: window.inbox, after: window.startAt.replace("Z", ".000Z"), before: window.endAt.replace("Z", ".000Z") });
});
test("incomplete and looping agenda reads fail rather than announce free time", async () => {
  for (const route of [() => ({}), () => ({ results: [{}] }), () => ({ results: [], nextCursor: "same" })]) {
    const fake = new FakePramaan({ [Cap.calendarAgendaGet]: route });
    await expect(busyIntervals(fake, window)).rejects.toThrow();
  }
});
test("distant recurring dates are expanded and deduplicated", async () => {
  const start = new Date(Date.now() + 100 * 86400_000).toISOString();
  const end = new Date(Date.now() + 101 * 86400_000).toISOString();
  const row = { startAt: start, endAt: end };
  const fake = new FakePramaan({ [Cap.calendarAgendaGet]: () => ({ results: [row] }), [Cap.calendarEventsList]: () => ({ results: [{ kind: "series", ref: "ref_series" }] }), [Cap.calendarEventInstancesList]: () => ({ results: [row] }) });
  expect(await busyIntervals(fake, { inbox: window.inbox, startAt: start, endAt: end })).toHaveLength(1);
  expect(fake.callsTo(Cap.calendarEventInstancesList)).toHaveLength(1);
});
test("unavailable calendars give a plain error and no retry", async () => {
  const fake = new FakePramaan({ [Cap.calendarCalendarsList]: () => { throw new PramaanError("upstream_unavailable", "hidden"); } });
  await expect(service(fake).listCalendars()).rejects.toThrow("not available yet");
  expect(fake.calls).toHaveLength(1);
});

test("renaming a booking updates the existing calendar event with a fresh identity", async () => {
 const fake = new FakePramaan({ [Cap.calendarEventUpdate]: () => ({ kind: "single" }) });
 const calendar = service(fake);
 await calendar.updateEvent("ref_fixture", event);
 await calendar.updateEvent("ref_fixture", { ...event, title: "Renamed visit" });
 expect(fake.calls[1]!.input).toMatchObject({ ref: "ref_fixture", title: "Renamed visit", description: "Booking", location: event.location });
 expect(fake.calls[1]!.opts?.idempotencyKey).not.toBe(fake.calls[0]!.opts?.idempotencyKey);
 expect(fake.callsTo(Cap.calendarEventCreate)).toHaveLength(0);
});
