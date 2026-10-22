import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { shortenOwned, changeOwned, linkId, type LinkRecord, type LinkStore } from "../../features/url-shortener/lifecycle";
const destination = "https://booking.example.test/host/visit", shortUrl = "https://links.example.test/visit", ref = "ref_01ARZ3NDEKTSV4RRFFQ69G5FAV";
function fixture() {
  let row: LinkRecord | null = null;
  const store: LinkStore = {
    async get() { return row; },
    async claim(next, previous) { if (previous ? row?.status !== "ready" || row.operation !== previous : Boolean(row)) return false; row = next; return true; },
    async save(next, expected) { if (row?.operation !== expected) return false; row = next; return true; },
  };
  return { store, row: () => row! };
}
test("owned short links are created once, can be checked, changed and deleted with approval identity", async () => {
  const f = fixture(), target = "https://booking.example.test/host/new-visit";
  const client = new FakePramaan({
    [Cap.shortLinkCreate]: () => ({ shortUrl, destinationUrl: destination, ref }),
    [Cap.shortLinkGet]: () => ({ shortUrl, destinationUrl: destination, clicks: 4 }),
    [Cap.shortLinkClicksGet]: () => ({ totalClicks: 2, days: [{ date: "2026-10-13", clicks: 2 }] }),
    [Cap.shortLinkUpdate]: input => ({ shortUrl, destinationUrl: (input as any).destinationUrl }),
    [Cap.shortLinkDelete]: () => ({ deleted: true }),
  });
  expect((await shortenOwned(f.store, client, 1, "fixture_app", destination)).shortLink).toBe(shortUrl);
  await shortenOwned(f.store, client, 1, "fixture_app", destination);
  expect(client.callsTo(Cap.shortLinkCreate)).toHaveLength(1);
  expect((await client.shortLinkGet({ endUserRef: "host_1", ref })).clicks).toBe(4);
  expect((await client.shortLinkClicksGet({ endUserRef: "host_1", ref })).totalClicks).toBe(2);
  await changeOwned(f.store, client, 1, linkId(destination), "update", target);
  expect(f.row().destinationUrl).toBe(target);
  expect((await shortenOwned(f.store, client, 1, "fixture_app", destination)).shortLink).toBe(destination);
  await changeOwned(f.store, client, 1, linkId(destination), "delete");
  expect(f.row().status).toBe("deleted");
  expect(client.calls.filter(row => [Cap.shortLinkCreate, Cap.shortLinkUpdate, Cap.shortLinkDelete].includes(row.id as any)).every(row => row.opts?.idempotencyKey)).toBe(true);
});
test("connection-required, unavailable and refused ids or fields retain original booking URLs", async () => {
  for (const code of ["connection_required", "upstream_unavailable", "not_found", "invalid_request"] as const) {
    const f = fixture(), client = new FakePramaan({ [Cap.shortLinkCreate]: () => { throw new PramaanError(code, "Unknown field"); } });
    const result = await shortenOwned(f.store, client, 1, "fixture_app", destination);
    expect(result.shortLink).toBe(destination); expect(result.message).toContain("not available yet");
    await shortenOwned(f.store, client, 1, "fixture_app", destination); expect(client.calls).toHaveLength(1);
    expect(f.row().status).toBe("fallback");
  }
});
test("uncertain creation and changes are never resent, even by another caller", async () => {
  const f = fixture(), client = new FakePramaan({ [Cap.shortLinkCreate]: () => { throw new Error("lost answer"); } });
  await Promise.all([shortenOwned(f.store, client, 1, "fixture_app", destination), shortenOwned(f.store, client, 1, "fixture_app", destination)]);
  await shortenOwned(f.store, client, 1, "fixture_app", destination);
  expect(client.calls).toHaveLength(1); expect(f.row().status).toBe("uncertain");
  const other = fixture(), changes = new FakePramaan({ [Cap.shortLinkCreate]: () => ({ shortUrl, destinationUrl: destination, ref }), [Cap.shortLinkUpdate]: () => { throw new Error("lost answer"); } });
  await shortenOwned(other.store, changes, 1, "fixture_app", destination);
  expect((await changeOwned(other.store, changes, 1, linkId(destination), "update", destination + "-new")).message).toContain("could not be confirmed");
  await expect(changeOwned(other.store, changes, 1, linkId(destination), "update", destination + "-new")).rejects.toThrow("previous");
  expect(changes.callsTo(Cap.shortLinkUpdate)).toHaveLength(1);
});
test("fake refuses credentials, unknown fields, missing approval and oversized click windows", async () => {
  const fake = new FakePramaan({ [Cap.shortLinkCreate]: () => ({ shortUrl, destinationUrl: destination }), [Cap.shortLinkDelete]: () => ({ deleted: true }), [Cap.shortLinkClicksGet]: () => ({ totalClicks: 0, days: [] }) });
  await expect(fake.shortLinkCreate({ endUserRef: "host_1", app: "fixture_app", destinationUrl: "https://name:secret@example.test" }, { idempotencyKey: "fixture" })).rejects.toThrow("URL");
  await expect(fake.shortLinkCreate({ endUserRef: "host_1", app: "fixture_app", destinationUrl: destination, unknown: true } as any, { idempotencyKey: "fixture" })).rejects.toThrow("field");
  await expect(fake.shortLinkDelete({ endUserRef: "host_1", ref, confirm: false } as any, { idempotencyKey: "fixture" })).rejects.toThrow("Approve");
  await expect(fake.shortLinkClicksGet({ endUserRef: "host_1", ref, startDate: "2026-01-01", endDate: "2026-04-01" })).rejects.toThrow("90");
  expect(fake.calls).toHaveLength(0);
});
test("refused destination changes and disconnected deletes never report success or repeat", async () => {
  for (const action of ["update", "delete"] as const) {
    for (const code of ["connection_required", "upstream_unavailable", "invalid_request", "not_found"] as const) {
      const f = fixture(), client = new FakePramaan({ [Cap.shortLinkCreate]: () => ({ shortUrl, destinationUrl: destination, ref }), [action === "update" ? Cap.shortLinkUpdate : Cap.shortLinkDelete]: () => { throw new PramaanError(code, "Unknown field"); } });
      await shortenOwned(f.store, client, 1, "fixture_app", destination);
      expect((await changeOwned(f.store, client, 1, linkId(destination), action, destination + "-new")).message).toContain("not available yet");
      expect(f.row().status).toBe("fallback");
      await expect(changeOwned(f.store, client, 1, linkId(destination), action, destination + "-new")).rejects.toThrow("previous");
      expect(client.calls).toHaveLength(2);
    }
  }
});
