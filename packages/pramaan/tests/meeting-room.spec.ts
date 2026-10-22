import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { ensureRoom, deleteRoom, type RoomRecord, type RoomStore } from "../../features/bookings/meeting-rooms/lifecycle";
import { revealHostLink } from "../../features/bookings/meeting-rooms/contracts";
const input = { hostId: 1, bookingUid: "booking-fixture", app: "fixture_app", title: "Visit", start: "2026-10-15T10:00:00Z", durationMinutes: 30, timezone: "UTC", fallbackUrl: "https://meeting.example.test/paste" };
const secret = "1".repeat(32), hostUrl = "https://meeting.example.test/private-host";
function fixture() { let record: RoomRecord | null = null; const store: RoomStore = {
  async get() { return record; }, async claim(row) { if (record && record.status !== "deleted") return false; record = row; return true; },
  async save(row) { record = row; }, async claimDelete() { if (record?.status !== "created") return false; record.status = "deleting"; return true; },
}; return { store, row: () => record! }; }
test("one room gives guests only the join link and keeps the host link authenticated and encrypted", async () => {
  const f = fixture(), fake = new FakePramaan({ [Cap.meetingRoomCreate]: () => ({ joinUrl: "https://meeting.example.test/guest", ref: "ref_room", hostUrl, dialIn: "+441234567890" }), [Cap.meetingRoomDelete]: () => ({ deleted: true }) });
  const guest = await ensureRoom(f.store, fake, input, secret);
  expect(guest.location).toBe("https://meeting.example.test/guest"); expect(JSON.stringify(guest)).not.toContain(hostUrl); expect(JSON.stringify(f.row())).not.toContain(hostUrl);
  expect(revealHostLink(f.row().report.hostCipher, secret, 1, input.bookingUid)).toBe(hostUrl);
  expect(() => revealHostLink(f.row().report.hostCipher, secret, 2, input.bookingUid)).toThrow();
  await ensureRoom(f.store, fake, input, secret); expect(fake.callsTo(Cap.meetingRoomCreate)).toHaveLength(1);
  await deleteRoom(f.store, fake, input.bookingUid); expect(f.row().status).toBe("deleted"); expect(f.row().report.hostCipher).toBeNull();
});
test("refused, disconnected and unavailable creation uses the pasted link without another effect", async () => {
  for (const code of ["not_found", "invalid_request", "connection_required", "upstream_unavailable"] as const) {
    const f = fixture(), fake = new FakePramaan({ [Cap.meetingRoomCreate]: () => { throw new PramaanError(code, "Unknown field"); } });
    expect((await ensureRoom(f.store, fake, input, secret)).location).toBe(input.fallbackUrl);
    await ensureRoom(f.store, fake, input, secret); expect(fake.calls).toHaveLength(1);
  }
});
test("lost creation or deletion never causes an automatic repeated effect", async () => {
  const f = fixture(), fake = new FakePramaan({ [Cap.meetingRoomCreate]: () => { throw new Error("lost"); } });
  await ensureRoom(f.store, fake, input, secret); await ensureRoom(f.store, fake, input, secret);
  expect(f.row().status).toBe("uncertain"); expect(fake.calls).toHaveLength(1);
  const other = fixture(), failedDelete = new FakePramaan({ [Cap.meetingRoomCreate]: () => ({ joinUrl: input.fallbackUrl, ref: "ref_room" }), [Cap.meetingRoomDelete]: () => { throw new Error("lost"); } });
  await ensureRoom(other.store, failedDelete, input, secret); await deleteRoom(other.store, failedDelete, input.bookingUid); await deleteRoom(other.store, failedDelete, input.bookingUid);
  expect(other.row().status).toBe("delete_uncertain"); expect(failedDelete.callsTo(Cap.meetingRoomDelete)).toHaveLength(1);
});
test("room reads and recording handles use the owner scope, with storage absent kept unavailable", async () => {
  const fake = new FakePramaan({ [Cap.meetingRoomGet]: () => ({ joinUrl: input.fallbackUrl }), [Cap.meetingRecordingsList]: () => ({ results: [{ status: "ready", ref: "ref_recording" }] }), [Cap.meetingRecordingGet]: () => ({ status: "ready" }) });
  await fake.meetingRoomGet({ endUserRef: "host_1", ref: "ref_room" });
  expect((await fake.meetingRecordingsList({ endUserRef: "host_1", ref: "ref_room" })).results[0]?.file).toBeUndefined();
  expect((await fake.meetingRecordingGet({ endUserRef: "host_1", ref: "ref_recording" })).file).toBeUndefined();
  expect(fake.calls.every(row => (row.input as any).endUserRef === "host_1")).toBe(true);
});
