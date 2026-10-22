import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { checkedAvailability, CANNOT_CONFIRM } from "../../app-store/pramaan-calendar/lib/availability";
const input = { inbox: "host@example.test", names: ["Work", "Personal"], start: "2026-10-15T00:00:00Z", end: "2026-10-16T00:00:00Z", timezone: "Europe/London" };
test("selected names use one complete free-busy check with exact UTC intervals", async () => {
  const fake = new FakePramaan({ [Cap.calendarFreeBusyGet]: () => ({ results: [{ calendar: 0, busy: [{ start: "2026-10-15T10:00:00Z", end: "2026-10-15T11:00:00Z" }] }, { calendar: 1, busy: [] }] }) });
  expect(await checkedAvailability(fake, input)).toHaveLength(1);
  expect(fake.calls[0]?.input).toMatchObject({ calendars: [{ inbox: input.inbox, calendarName: "Work" }, { inbox: input.inbox, calendarName: "Personal" }], timezone: input.timezone });
});
test("an older, unavailable or disconnected source falls back to primary agenda only", async () => {
  for (const code of ["not_found", "upstream_unavailable", "connection_required", "invalid_request"] as const) {
    const fake = new FakePramaan({ [Cap.calendarFreeBusyGet]: () => { throw new PramaanError(code, "Unknown capability field"); }, [Cap.calendarAgendaGet]: () => ({ results: [] }) });
    expect(await checkedAvailability(fake, { ...input, names: [] })).toEqual([]);
    expect(fake.callsTo(Cap.calendarAgendaGet)).toHaveLength(1);
  }
});
test("unavailable multiple calendars, incomplete rows and oversized reads fail closed", async () => {
  for (const response of [new PramaanError("upstream_unavailable", "not available"), new PramaanError("invalid_request", "Too many events"), { results: [{ calendar: 0, busy: [] }] }]) {
    const fake = new FakePramaan({ [Cap.calendarFreeBusyGet]: () => { if (response instanceof Error) throw response; return response; }, [Cap.calendarCalendarsList]: () => ({ results: [{ name: "Work", isPrimary: true }, { name: "Personal" }] }), [Cap.calendarAgendaGet]: () => ({ results: [] }) });
    await expect(checkedAvailability(fake, input)).rejects.toThrow(CANNOT_CONFIRM);
    expect(fake.callsTo(Cap.calendarAgendaGet)).toHaveLength(0);
  }
});
test("long windows use bounded chunks, and any failed fallback cannot imply free time", async () => {
  const fake = new FakePramaan({ [Cap.calendarFreeBusyGet]: (request: any) => ({ results: request.calendars.map((_: unknown, calendar: number) => ({ calendar, busy: [] })) }) });
  await checkedAvailability(fake, { ...input, names: [], end: "2027-02-01T00:00:00Z" });
  expect(fake.callsTo(Cap.calendarFreeBusyGet)).toHaveLength(2);
  const failure = new FakePramaan({ [Cap.calendarFreeBusyGet]: () => { throw new PramaanError("connection_required", "hidden"); }, [Cap.calendarAgendaGet]: () => { throw new Error("hidden"); } });
  await expect(checkedAvailability(failure, { ...input, names: [] })).rejects.toThrow(CANNOT_CONFIRM);
});
