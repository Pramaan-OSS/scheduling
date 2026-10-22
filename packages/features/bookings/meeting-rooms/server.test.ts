import prismaMock from "@scheduling/testing/lib/__mocks__/prismaMock";
import { expect, test } from "vitest";
import { FakePramaan } from "@scheduling/pramaan/fake";
import { Cap } from "@scheduling/pramaan";
import { roomStore, roomId } from "./server";
import { ensureRoom } from "./lifecycle";

test("a rescheduled replacement clears a cancellation that belonged to the previous room", async () => {
  const bookingUid = "booking-fixture", id = roomId(bookingUid);
  let saved: any = { id, bookingId: 1, userId: 1, plan: "previous-date", status: "deleted", report: {}, options: { cancelRequested: true } };
  prismaMock.outcomeReview.findUnique.mockImplementation(async () => saved);
  prismaMock.outcomeReview.updateMany.mockImplementation(async args => { saved = { ...saved, ...args.data }; return { count: 1 }; });
  prismaMock.outcomeReview.update.mockImplementation(async args => { saved = { ...saved, ...args.data }; return saved; });
  const fake = new FakePramaan({ [Cap.meetingRoomCreate]: () => ({ ref: "ref_01ARZ3NDEKTSV4RRFFQ69G5FAV", joinUrl: "https://meeting.example.test/guest" }) });
  await ensureRoom(roomStore(1), fake, { bookingUid, hostId: 1, app: "fixture_app", title: "Visit", start: "2026-10-16T10:00:00Z", durationMinutes: 30, timezone: "UTC", fallbackUrl: "https://meeting.example.test/paste" }, "1".repeat(32));
  expect(saved.status).toBe("created");
  expect(saved.options.cancelRequested).not.toBe(true);
  expect(fake.callsTo(Cap.meetingRoomCreate)).toHaveLength(1);
});

test("a pasted fallback remains usable with automatic rooms disabled", async () => {
  const { attachBookingRoom } = await import("./server");
  prismaMock.booking.findUnique.mockResolvedValue({ userId: 1, eventType: { metadata: { pramaanMeetingRoom: { enabled: false, fallbackUrl: "https://meeting.example.test/pasted" } } } } as any);
  const event = { uid: "pasted-booking", eventTypeId: 1, location: "integrations:retired" } as any;
  await attachBookingRoom(event);
  expect(event.location).toBe("https://meeting.example.test/pasted");
  expect(prismaMock.credential.findFirst).not.toHaveBeenCalled();
});
