import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { CATALOG } from "../src/catalog";
import { Cap, createPramaan, pramaanFromEnv, type CapId } from "../src/index";
import { FakePramaan } from "../src/fake";
import { authForStart } from "../../../scripts/managed-auth";
import { databaseForStart } from "../../../scripts/managed-database";
import { managedAuthMessage } from "../../../scripts/setup-refusal.mjs";

const actions = [...Object.values(CATALOG).filter(row => row.effectClass !== "read_only").map(row => row.id), "auth.user.delete"] as CapId[];
async function sandbox(fn: (root: string) => Promise<void>) {
  mkdirSync(".scratch/action-key-tests", { recursive: true });
  const root = mkdtempSync(".scratch/action-key-tests/start-");
  try { await fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
test("every action in the fake refuses missing or blank request keys before running", async () => {
  const fake = new FakePramaan(Object.fromEntries(actions.map(id => [id, () => { throw new Error("must not execute"); }])));
  for (const id of actions) for (const opts of [undefined, { idempotencyKey: " " }]) {
    await expect(fake.call(id, {}, opts)).rejects.toMatchObject({ code: "invalid_request", status: 400, message: "Idempotency-Key header is required for this capability." });
  }
  expect(fake.calls).toHaveLength(0);
  fake.route({ "auth.user.delete": () => ({ deleted: true }) });
  expect(await fake.call("auth.user.delete" as CapId, { userId: "fixture_user", confirm: true }, { idempotencyKey: "saved-delete" })).toEqual({ deleted: true });
});
test("startup fixture transport enforces actual action headers", async () => {
  const key = process.env.PRAMAAN_API_KEY, mode = process.env.PRAMAAN_FAKE;
  process.env.PRAMAAN_API_KEY = "fixture"; process.env.PRAMAAN_FAKE = "1";
  try {
    const client = pramaanFromEnv()!;
    for (const id of actions) await expect(client.call(id, {})).rejects.toMatchObject({ code: "invalid_request", status: 400 });
    expect(await client.call(Cap.authBackendProvision, {}, { idempotencyKey: "saved-provision" })).toMatchObject({ status: "ready" });
  } finally {
    if (key === undefined) delete process.env.PRAMAAN_API_KEY; else process.env.PRAMAAN_API_KEY = key;
    if (mode === undefined) delete process.env.PRAMAAN_FAKE; else process.env.PRAMAAN_FAKE = mode;
  }
});
test("provision and domains send saved stable headers through the real client across refused starts", () => sandbox(async root => {
  const headers: Array<{ id: string; key: string }> = []; let refuse = true;
  const client = createPramaan({ apiKey: "fixture-secret-never-log", fetch: async (url, init) => {
    const id = new URL(String(url)).pathname.split("/").pop()!;
    const key = new Headers(init?.headers).get("Idempotency-Key")!;
    const saved = JSON.parse(readFileSync(`${root}/.runtime/managed-auth.json`, "utf8"));
    expect(key).toBeTruthy();
    expect(id === "auth.backend.provision" ? key === saved.key : key.startsWith(saved.key + "-")).toBe(true);
    headers.push({ id, key });
    if (refuse) return Response.json({ error: { code: "invalid_request", message: "Idempotency-Key header is required for this capability. fixture-secret-never-log private diagnostic" } }, { status: 400 });
    return Response.json(id === "auth.backend.provision" ? { status: "ready", authUrl: "https://signin.example.test/api/auth", jwksUrl: "https://signin.example.test/api/auth/jwks" } : { allowedDomains: [{ domain: "https://booking.example.test" }] });
  } });
  const lines: string[] = [];
  await authForStart(root, client, "https://booking.example.test", line => lines.push(line));
  const saved = JSON.parse(readFileSync(`${root}/.runtime/managed-auth.json`, "utf8"));
  expect(lines).toEqual([managedAuthMessage("request_key")]);
  expect(lines.join()).not.toMatch(/fixture-secret|private diagnostic/);
  expect(saved.failureReason).toBe("request_key");
  refuse = false;
  await authForStart(root, client, "https://booking.example.test", () => {});
  await authForStart(root, client, "https://booking.example.test", () => {});
  expect(headers).toHaveLength(3);
  expect(headers[0].key).toBe(headers[1].key);
  expect(headers[2].id).toBe("auth.backend.domains.set");
  expect(JSON.parse(readFileSync(`${root}/.runtime/managed-auth.json`, "utf8")).failureReason).toBeUndefined();
}));
test("database sends its saved header and reports a refusal without private details", () => sandbox(async root => {
  const keys: string[] = [];
  const client = createPramaan({ apiKey: "fixture", fetch: async (_url, init) => {
    const saved = JSON.parse(readFileSync(`${root}/.runtime/managed-database.json`, "utf8"));
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(saved.key);
    keys.push(new Headers(init?.headers).get("Idempotency-Key")!);
    return Response.json({ error: { code: "invalid_request", message: "Idempotency-Key header is required for this capability. private detail" } }, { status: 400 });
  } });
  for (let attempt = 0; attempt < 2; attempt++) {
    await expect(databaseForStart(root, client, { connectionString: "local", directConnectionString: "local" })).rejects.toThrow("Managed database setup was refused: a required request identifier (Idempotency-Key header) is missing.");
    expect(keys).toHaveLength(attempt + 1);
  }
  expect(keys[0]).toBe(keys[1]);
}));

test("startup summary repeats only the saved plain refusal reason", () => sandbox(async root => {
  mkdirSync(`${root}/.runtime`, { recursive: true });
  const script = resolve("scripts/startup-summary.mjs");
  writeFileSync(`${root}/.runtime/managed-auth.json`, JSON.stringify({ status: "unavailable", failureReason: "request_key", key: "fixture-secret-never-log" }));
  const output = execFileSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  expect(output.trim()).toBe(managedAuthMessage("request_key"));
  expect(output).not.toContain("fixture-secret");
  writeFileSync(`${root}/.runtime/managed-auth.json`, JSON.stringify({ status: "unavailable", failureReason: "toString" }));
  expect(execFileSync(process.execPath, [script], { cwd: root, encoding: "utf8" })).toContain("the setup result could not be confirmed");
}));
