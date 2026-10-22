import { expect, test } from "vitest";
import { buildCalendarEvent, buildPerson } from "@scheduling/lib/test/builder";
import { FakePramaan } from "@scheduling/pramaan/fake";
import { dispatchEmail } from "./dispatch-email";
import generateIcsFile, { GenerateIcsRole } from "./generateIcsFile";

test("real booking invitations retain identifiers and revisions through confirmation, reschedule and cancellation", async () => {
  const fake = new FakePramaan({ "email.send": () => ({ status: "sent" }) });
  const event = buildCalendarEvent({ iCalUID: "stable-booking", iCalSequence: 0,
    organizer: buildPerson({ timeZone: "Europe/London" }), attendees: [buildPerson()],
    startTime: "2026-10-14T10:00:31.000Z", endTime: "2026-10-14T11:00:31.000Z" });
  for (const [sequence, status] of [[0, "CONFIRMED"], [1, "CONFIRMED"], [2, "CANCELLED"]] as const) {
    const changed = { ...event, iCalSequence: sequence,
      startTime: sequence ? "2026-10-15T10:00:31.000Z" : event.startTime,
      endTime: sequence ? "2026-10-15T11:00:31.000Z" : event.endTime };
    const icalEvent = generateIcsFile({ calEvent: changed, role: GenerateIcsRole.ATTENDEE, status });
    await dispatchEmail({ from: "Booking <sender@example.test>", to: "guest@example.test",
      subject: "Booking", text: "Details", icalEvent }, { origin: "https://booking.example.test", secret: "fixture-secret" }, fake);
  }
  expect(fake.calls.map(call => (call.input as any).invitation)).toMatchObject([
    { uid: "stable-booking", sequence: 0, method: "request", start: "2026-10-14T10:00:31Z" },
    { uid: "stable-booking", sequence: 1, method: "request", start: "2026-10-15T10:00:31Z" },
    { uid: "stable-booking", sequence: 2, method: "cancel", organiser: "sender@example.test", attendees: ["guest@example.test"] },
  ]);
});
