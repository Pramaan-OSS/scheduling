import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { PramaanError } from "../src/index";
import { startOwnedConnection, CALENDAR_CONNECTION_APPS, type ConnectionIntent } from "../../features/bookings/owned-apps/connect";
const input = { app: "fixture_app", endUserRef: "host_1", access: "read-write" as const, redirectUrl: "https://booking.example.test/settings/my-account/calendars" };
function fixture() { let row: ConnectionIntent | undefined; return { get: async () => row, save: async (next: ConnectionIntent) => { row = next; } }; }
test("a connection saves its identity before the action and sends the header", async () => {
  const store = fixture();
  const client = new FakePramaan({ "apps.connection.start": async (_input, opts) => { expect(await store.get()).toEqual({ idempotencyKey: opts?.idempotencyKey, status: "starting" }); return { connectUrl: "https://connection.example.test/fixture" }; } });
  expect(await startOwnedConnection(client, input, store)).toContain("https://connection.example.test");
  await expect(startOwnedConnection(client, input, store)).rejects.toThrow("already requested");
  expect(client.calls).toHaveLength(1);
});
test("lost connection results stay blocked even after another app is selected", async () => {
  const store = fixture(), client = new FakePramaan({ "apps.connection.start": () => { throw new Error("lost"); } });
  await expect(startOwnedConnection(client, input, store)).rejects.toThrow("Check your connected account");
  await expect(startOwnedConnection(client, { ...input, app: "another_app" }, store)).rejects.toThrow("Check your connected account");
  expect(client.calls).toHaveLength(1);
});
test("a definite refusal permits a manual request with the same saved identity", async () => {
  const store = fixture(), client = new FakePramaan({ "apps.connection.start": () => { throw new PramaanError("invalid_request", "refused", { status: 400 }); } });
  await expect(startOwnedConnection(client, input, store)).rejects.toThrow();
  await expect(startOwnedConnection(client, input, store)).rejects.toThrow();
  expect(client.calls[0].opts?.idempotencyKey).toBe(client.calls[1].opts?.idempotencyKey);
});
test("calendar consent uses exact catalog app ids and never treats a link as confirmed access", async () => {
  for (const app of CALENDAR_CONNECTION_APPS) {
    const store = fixture();
    const client = new FakePramaan({ "apps.connection.start": request => {
      if (!["googlecalendar", "outlook"].includes((request as { app: string }).app)) throw new PramaanError("not_found", "The app was not found.", { status: 404 });
      return { connectUrl: "https://connection.example.test/consent" };
    } });
    expect(await startOwnedConnection(client, { ...input, app }, store)).toBe("https://connection.example.test/consent");
    expect(client.calls[0].input).toEqual({ app, endUserRef: input.endUserRef, redirectUrl: input.redirectUrl });
    expect(client.calls[0].opts?.idempotencyKey).toBeTruthy();
    expect(await store.get()).toHaveProperty("status", "done");
    expect(client.calls.map(call => call.id)).toEqual(["apps.connection.start"]);
  }
});
test("connection starts omit unsupported access levels instead of repeating the live refusal", async () => {
  const store = fixture();
  const client = new FakePramaan({ "apps.connection.start": request => {
    if ("access" in (request as object)) throw new PramaanError("invalid_request", "Access levels are not available yet.", { status: 400 });
    return { connectUrl: "https://connection.example.test/consent" };
  } });
  expect(await startOwnedConnection(client, input, store)).toBe("https://connection.example.test/consent");
  expect(client.calls[0].input).not.toHaveProperty("access");
});
