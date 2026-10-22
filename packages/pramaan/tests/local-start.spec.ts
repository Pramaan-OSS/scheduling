import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, statSync, rmSync } from "node:fs";
import { configure } from "../../../scripts/local-config.mjs";
import { pramaanFromEnv, Cap } from "../src/index";

test("first run generates private secrets once without replacing entered settings", () => {
  mkdirSync(".runtime/config-tests", { recursive: true });
  const directory = mkdtempSync(".runtime/config-tests/start-");
  try {
    writeFileSync(`${directory}/.env.example`, "PRAMAAN_API_KEY=fixture-local-only\nNEXTAUTH_SECRET=\nSCHEDULING_ENCRYPTION_KEY=\n");
    configure(directory);
    const first = readFileSync(`${directory}/.env`, "utf8");
    expect(first.includes("PRAMAAN_API_KEY=fixture-local-only")).toBe(true);
    expect(/^NEXTAUTH_SECRET=[a-f0-9]{64}$/m.test(first)).toBe(true);
    expect(/^SCHEDULING_ENCRYPTION_KEY=[a-f0-9]{32}$/m.test(first)).toBe(true);
    expect(statSync(`${directory}/.env`).mode & 0o777).toBe(0o600);
    configure(directory); expect(readFileSync(`${directory}/.env`, "utf8") === first).toBe(true);
  } finally { rmSync(directory, { recursive: true }); }
});
test("explicit local fixture mode serves calendar reads and refuses unrouted actions", async () => {
  const key = process.env.PRAMAAN_API_KEY, mode = process.env.PRAMAAN_FAKE;
  process.env.PRAMAAN_API_KEY = "fixture-local-only"; process.env.PRAMAAN_FAKE = "1";
  try {
    const client = pramaanFromEnv()!;
    expect(await client.call(Cap.calendarCalendarsList, { inbox: "host@example.test" })).toEqual({ results: [{ name: "Primary calendar", isPrimary: true, readOnly: false }] });
    await expect(client.call(Cap.emailSend, {}, { idempotencyKey: "fixture-send" })).rejects.toThrow("not available yet");
  } finally { if (key === undefined) delete process.env.PRAMAAN_API_KEY; else process.env.PRAMAAN_API_KEY = key; if (mode === undefined) delete process.env.PRAMAAN_FAKE; else process.env.PRAMAAN_FAKE = mode; }
});
