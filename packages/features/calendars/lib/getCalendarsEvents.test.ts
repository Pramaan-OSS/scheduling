import { expect, test, vi, beforeEach } from "vitest";
import { FakePramaan } from "@scheduling/pramaan/fake";
import { Cap, PramaanError } from "@scheduling/pramaan";
import { PrimaryCalendar } from "@scheduling/app-store/pramaan-calendar/lib/CalendarService";
import type { CredentialForCalendarService } from "@scheduling/types/Credential";
import getCalendarsEvents from "./getCalendarsEvents";
let client: FakePramaan;
vi.mock("@scheduling/app-store/_utils/getCalendar", () => ({ getCalendar: (credential: CredentialForCalendarService) => new PrimaryCalendar(credential, client) }));
const credential = { id: 42, type: "pramaan_calendar", appId: "pramaan-calendar", key: { inbox: "host@example.test" }, invalid: false, encryptedKey: null, delegatedToId: null } as CredentialForCalendarService;
beforeEach(() => { client = new FakePramaan({ [Cap.calendarFreeBusyGet]: () => ({ results: [{ calendar: 0, busy: [{ start: "2026-10-20T10:00:00Z", end: "2026-10-20T11:00:00Z" }] }] }) }); });
test("reads busy time from one primary calendar without an unrelated-calendar fallback", async () => {
 const result = await getCalendarsEvents([credential], "2026-10-20T00:00:00Z", "2026-10-21T00:00:00Z", [], "slots");
 expect(result.flat()).toHaveLength(1);
 expect(client.calls).toHaveLength(1);
 expect(client.calls[0].input).toMatchObject({ calendars: [{ inbox: "host@example.test" }] });
});
test("unavailable primary calendar is not reported as empty busy time", async () => {
 client = new FakePramaan({ [Cap.calendarFreeBusyGet]: () => { throw new PramaanError("connection_required", "hidden"); }, [Cap.calendarAgendaGet]: () => { throw new PramaanError("upstream_unavailable", "not available yet", { status: 502 }); } });
 await expect(getCalendarsEvents([credential], "2026-10-20T00:00:00Z", "2026-10-21T00:00:00Z", [], "slots")).rejects.toThrow("Cannot confirm availability");
 expect(client.calls).toHaveLength(2);
});
