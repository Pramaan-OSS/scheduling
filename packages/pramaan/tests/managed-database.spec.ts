import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, statSync, rmSync, existsSync } from "node:fs";
import { FakePramaan } from "../src/fake";
import { PramaanError, createPramaan } from "../src/index";
import { databaseForStart } from "../../../scripts/managed-database";
import { databaseRedactor, privateDatabaseOutput } from "../../../scripts/database-output";
import { PassThrough } from "node:stream";

const local = { connectionString: "postgresql://local:private@database:5432/scheduling", directConnectionString: "postgresql://local:private@database:5432/scheduling" };
const managed = { connectionString: "postgresql://app_owner:secret@pool.example.test/app?sslmode=require", directConnectionString: "postgresql://app_owner:secret@direct.example.test/app?sslmode=require" };
const ready = { status: "ready", database: "app", role: "app_owner", created: true, limits: { maxComputeUnits: 1, maxStorageGb: 1, monthlyComputeHours: 1 }, ...managed };
async function sandbox(fn: (root: string) => Promise<void>) {
  mkdirSync(".scratch/database-tests", { recursive: true });
  const root = mkdtempSync(".scratch/database-tests/start-");
  try { await fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
test("provision saves one-time addresses privately and reuses them without a second call", () => sandbox(async root => {
  const client = new FakePramaan({ "db.postgres.provision": () => ready });
  const output: string[] = [];
  expect(await databaseForStart(root, client, local, line => output.push(line))).toEqual(managed);
  expect(await databaseForStart(root, client, local, line => output.push(line))).toEqual(managed);
  expect(client.calls.length).toBe(1);
  expect(client.calls[0].input).toEqual({});
  expect(client.calls[0].opts?.idempotencyKey).toBeTruthy();
  expect(statSync(`${root}/.runtime/managed-database.json`).mode & 0o777).toBe(0o600);
  expect(JSON.parse(readFileSync(`${root}/.runtime/managed-database.json`, "utf8")).connectionString).toBe(managed.connectionString);
  expect(output).toEqual([]);
}));
test("explicit unavailability selects local once and never silently changes existing data", () => sandbox(async root => {
  const client = new FakePramaan({ "db.postgres.provision": () => { throw new PramaanError("upstream_unavailable", "private upstream detail", { status: 502 }); } });
  const output: string[] = [];
  expect(await databaseForStart(root, client, local, line => output.push(line))).toEqual(local);
  expect(await databaseForStart(root, client, local, line => output.push(line))).toEqual(local);
  expect(client.calls.length).toBe(1);
  expect(output).toEqual(["Managed database is not available yet; using the bundled local database.", "Using the saved bundled local database; existing booking data stays in place."]);
}));
test("adding a key after a local start never silently replaces its booking database", () => sandbox(async root => {
  expect(await databaseForStart(root, null, local)).toEqual(local);
  const client = new FakePramaan({ "db.postgres.provision": () => ready });
  expect(await databaseForStart(root, client, local, () => {})).toEqual(local);
  expect(client.calls.length).toBe(0);
}));
test("lost answers and repeats fail closed without resending one-time credential requests", () => sandbox(async root => {
  const client = new FakePramaan({ "db.postgres.provision": () => { throw new PramaanError("upstream_unavailable", "lost secret response"); } });
  await expect(databaseForStart(root, client, local)).rejects.toThrow("could not be confirmed");
  await expect(databaseForStart(root, client, local)).rejects.toThrow("could not be confirmed");
  expect(client.calls.length).toBe(1);
}));
test("an existing remote database without its one-time addresses is not a local fallback", () => sandbox(async root => {
  const client = new FakePramaan({ "db.postgres.provision": () => ({ ...ready, created: false, connectionString: undefined, directConnectionString: undefined }) });
  await expect(databaseForStart(root, client, local)).rejects.toThrow("Restore saved private settings");
  expect(client.calls.length).toBe(1);
}));
test("unusable one-time addresses on a first start stop safely and name the rotation recovery", () => sandbox(async root => {
  for (const broken of [
    { ...ready, connectionString: "postgresql://app_owner:pa#ss@pool.example.test/app" },
    { ...ready, directConnectionString: undefined },
  ]) {
    const client = new FakePramaan({ "db.postgres.provision": () => broken });
    await expect(databaseForStart(root, client, local)).rejects.toThrow("rotate the database credentials once");
    expect(client.calls.length).toBe(1);
    expect(existsSync(`${root}/.runtime/managed-database.json`)).toBe(true);
    const state = JSON.parse(readFileSync(`${root}/.runtime/managed-database.json`, "utf8"));
    expect(state.mode).toBeUndefined();
    expect(state.pending).toBe(false);
  }
}));
test("wire unavailable answer uses one call even if the server suggests retry", () => sandbox(async root => {
  let calls = 0;
  const client = createPramaan({ apiKey: "fixture", fetch: async () => { calls++; return Response.json({ error: { code: "upstream_unavailable", retryable: true, message: "private detail" } }, { status: 502 }); } });
  expect(await databaseForStart(root, client, local, () => {})).toEqual(local);
  expect(calls).toBe(1);
}));
test("database diagnostics hide addresses and secrets even across stream chunks", async () => {
  const stream = new PassThrough(); const lines: string[] = [];
  privateDatabaseOutput(stream, databaseRedactor([managed.connectionString]), line => lines.push(line));
  const finished = new Promise<void>(resolve => stream.on("end", resolve));
  stream.write(managed.connectionString.slice(0, 25)); stream.write(managed.connectionString.slice(25) + "\n");
  stream.end("password secret at pool.example.test\n"); await finished;
  expect(lines.join("")).not.toContain("secret"); expect(lines.join("")).not.toContain("pool.example.test"); expect(lines.join("")).not.toContain(managed.connectionString);
});
