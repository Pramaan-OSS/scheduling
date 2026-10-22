import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { dispatchEmail, prepareEmail } from "../../emails/lib/dispatch-email";
import { calendarLink, readCalendarLink } from "../../emails/lib/calendar-link";

const options = { origin: "https://booking.example.test", secret: "fixture-session-secret" };
const payload = { from: "Booking <sender@example.test>", to: "Guest <guest@example.test>", subject: "Booked", text: "Confirmed", icalEvent: { invitation: { uid: "booking-1", title: "Visit", start: "2026-10-14T10:00:00Z", end: "2026-10-14T11:00:00Z", timeZone: "Europe/London", method: "request" as const, sequence: 0 }, content: "BEGIN:VCALENDAR\r\nSUMMARY:Visit\r\nDTSTART:20261014T100000Z\r\nDTEND:20261014T110000Z\r\nEND:VCALENDAR" } };

test("booking email sends an invitation with details and no download link", async () => {
  const fake = new FakePramaan({ [Cap.emailSend]: () => ({ status: "queued", ref: "fixture" }) });
  await dispatchEmail(payload, options, fake);
  const sent = fake.calls[0]!;
  const input = sent.input as any;
  expect(input.to).toEqual(["guest@example.test"]);
  expect(input.text).toContain("SUMMARY:Visit");
  expect(input.invitation).toMatchObject({ uid: "booking-1", organiser: "sender@example.test", attendees: ["guest@example.test"], method: "request", sequence: 0 });
  expect(input.text).not.toContain("Add to calendar:");
  expect(input).not.toHaveProperty("icalEvent");
  await dispatchEmail(payload, options, fake);
  expect(fake.calls[1]!.opts?.idempotencyKey).toBe(sent.opts?.idempotencyKey);
});
test("calendar downloads refuse tampering, expiry and another session secret", () => {
  const link = new URL(calendarLink("BEGIN:VCALENDAR", options.origin, options.secret, 1000));
  const token = link.searchParams.get("token")!;
  expect(() => readCalendarLink(token, options.secret, 31 * 86400_000)).toThrow();
  expect(() => readCalendarLink(token, "other", 1001)).toThrow();
  expect(() => readCalendarLink(`x${token}`, options.secret, 1001)).toThrow();
});
test("copy recipients and primary reply address use the contract", () => {
  expect(prepareEmail({ ...payload, cc: ["Copy <copy@example.test>"], replyTo: "guest@example.test, host@example.test" }, options)).toMatchObject({ cc: ["copy@example.test"], replyTo: "host@example.test" });
});
test("an unavailable or uncertain email is not reported as sent or resent", async () => {
  for (const error of [new PramaanError("upstream_unavailable", "hidden"), new Error("hidden")]) {
    const fake = new FakePramaan({ [Cap.emailSend]: () => { throw error; } });
    await expect(dispatchEmail(payload, options, fake)).rejects.toThrow(error instanceof PramaanError ? "not available yet" : "Check its status");
    expect(fake.calls).toHaveLength(error instanceof PramaanError ? 2 : 1);
  }
});

test("reschedule and cancellation preserve the uid and raise revisions", async () => {
  const fake = new FakePramaan({ [Cap.emailSend]: () => ({ status: "sent" }) });
  for (const [sequence, method] of [[0, "request"], [1, "request"], [2, "cancel"]] as const) {
    await dispatchEmail({ ...payload, icalEvent: { ...payload.icalEvent,
      invitation: { ...payload.icalEvent.invitation, sequence, method,
        start: sequence ? "2026-10-15T10:00:00Z" : payload.icalEvent.invitation.start,
        end: sequence ? "2026-10-15T11:00:00Z" : payload.icalEvent.invitation.end } } }, options, fake);
  }
  expect(fake.calls.map(call => (call.input as any).invitation)).toMatchObject([
    { uid: "booking-1", sequence: 0, method: "request" },
    { uid: "booking-1", sequence: 1, method: "request", start: "2026-10-15T10:00:00Z" },
    { uid: "booking-1", sequence: 2, method: "cancel" },
  ]);
  expect(new Set(fake.calls.map(call => call.opts?.idempotencyKey)).size).toBe(3);
});
test("definite invitation refusal uses one protected link-only fallback", async () => {
  for (const error of [new PramaanError("invalid_request", "Unknown field: invitation"), new PramaanError("upstream_unavailable", "not available yet")]) {
    const fake = new FakePramaan({ [Cap.emailSend]: input => {
      if ((input as any).invitation) throw error;
      return { status: "queued" };
    } });
    await dispatchEmail(payload, options, fake);
    expect(fake.calls).toHaveLength(2);
    const fallback = fake.calls[1]!.input as any;
    expect(fallback).not.toHaveProperty("invitation");
    const url = new URL(fallback.text.split("Add to calendar: ")[1]);
    expect(readCalendarLink(url.searchParams.get("token")!, options.secret)).toBe(payload.icalEvent.content);
    expect(fake.calls[1]!.opts?.idempotencyKey).toBe(`${fake.calls[0]!.opts?.idempotencyKey}-calendar-link`);
  }
});
test("unrelated validation, jobs and uncertain results never fall back", async () => {
  for (const error of [new PramaanError("invalid_request", "Invalid recipient"),
    new PramaanError("upstream_unavailable", "hidden", { jobId: "job-fixture" }), new Error("lost answer")]) {
    const fake = new FakePramaan({ [Cap.emailSend]: () => { throw error; } });
    await expect(dispatchEmail(payload, options, fake)).rejects.toThrow();
    expect(fake.calls).toHaveLength(1);
  }
  const fake = new FakePramaan({ [Cap.emailSend]: () => ({ status: "unknown" }) });
  await expect(dispatchEmail(payload, options, fake)).rejects.toThrow("Check its status");
  expect(fake.calls).toHaveLength(1);
});
