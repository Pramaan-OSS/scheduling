import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, Pramaan } from "../src/index";
import { PrimaryCalendar } from "../../app-store/pramaan-calendar/lib/CalendarService";

const cases: Array<[string, Record<string, unknown>]> = [
  [Cap.calendarEventCreate, { start: "2026-10-17T10:00:00Z", end: "2026-10-17T11:00:00Z" }],
  [Cap.calendarEventUpdate, { start: "2026-10-17T10:00:00Z" }],
  [Cap.calendarFreeBusyGet, { after: "2026-10-17T10:00:00Z", before: "2026-10-17T11:00:00Z" }],
  [Cap.calendarAgendaGet, { after: "2026-10-17T10:00:00Z" }],
  [Cap.meetingRoomCreate, { start: "2026-10-17T10:00:00Z" }],
  [Cap.paymentsPaymentLinkCreate, { expiresAt: "2026-10-17T10:00:00Z" }],
];
test("fake and real client refuse every outgoing date without a year and zone before dispatch", async () => {
  for (const [id, input] of cases) {
    for (const invalid of ["2026-10-17T10:00:00", "2026-10-17", "October 17 at 10am"]) {
      const broken = { ...input, [Object.keys(input)[0]]: invalid };
      const fake = new FakePramaan();
      await expect(fake.call(id, broken, { idempotencyKey: "fixture" })).rejects.toThrow("four-digit year");
      expect(fake.calls).toHaveLength(0);
      let dispatched = false;
      const client = new Pramaan({ call: async () => { dispatched = true; }, run: async () => { dispatched = true; } } as any);
      await expect(client.call(id, broken)).rejects.toThrow("time-zone offset");
      await expect(client.run(id, broken)).rejects.toThrow("time-zone offset");
      expect(dispatched).toBe(false);
    }
  }
});
test("calendar create and update preserve booking instants across summer and winter offsets", async () => {
  const fake = new FakePramaan({ [Cap.calendarEventCreate]: () => ({ ref: "ref_fixture" }), [Cap.calendarEventUpdate]: () => ({ kind: "single" }) });
  const calendar = new PrimaryCalendar({ id: 1, key: { inbox: "host@example.test" } } as any, fake);
  for (const [startTime, endTime, utc] of [
    ["2026-07-17T10:00:00+01:00", "2026-07-17T11:00:00+01:00", "2026-07-17T09:00:00.000Z"],
    ["2026-12-17T10:00:00+00:00", "2026-12-17T11:00:00+00:00", "2026-12-17T10:00:00.000Z"],
  ]) {
    const event = { title: "Visit", startTime, endTime, organizer: { timeZone: "Europe/London" }, attendees: [] } as any;
    await calendar.createEvent(event); await calendar.updateEvent("ref_fixture", event);
    for (const call of fake.calls.slice(-2)) expect(call.input).toMatchObject({ start: utc, timezone: "Europe/London" });
  }
});

test("invitation dates are checked before the fake dispatches email", async () => {
  const fake = new FakePramaan();
  for (const start of ["2026-10-17T10:00:00", "October 17 at 10am"]) {
    await expect(fake.call(Cap.emailSend, { invitation: { start, end: "2026-10-17T11:00:00Z" } }, { idempotencyKey: "fixture" })).rejects.toThrow("invitation.start");
  }
  expect(fake.calls).toHaveLength(0);
});
