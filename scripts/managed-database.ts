import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Cap, type Caps, type Pramaan } from "../packages/pramaan/src/index";
import { setupRefusalReason, setupRefusalText } from "./setup-refusal.mjs";
import { savePrivateState, privateFile } from "./private-state";

type State = { version: 1; key: string; mode?: "managed" | "local"; localReason?: "unavailable" | "no_key"; connectionString?: string; directConnectionString?: string; pending?: boolean };
const fallback = "Managed database is not available yet; using the bundled local database.";
export class DatabaseSetupError extends Error {}

export async function databaseForStart(root: string, client: Pramaan | null, local: { connectionString: string; directConnectionString: string }, report = console.log) {
  const folder = resolve(root, ".runtime");
  const path = resolve(folder, "managed-database.json");
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  const state: State = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { version: 1, key: randomUUID() };
  const save = () => savePrivateState(path, state);
  if (state.version !== 1 || !state.key) throw new DatabaseSetupError("Restore the saved private database settings before starting.");
  if (state.mode === "managed") {
    if (!validAddress(state.connectionString) || !validAddress(state.directConnectionString)) throw new DatabaseSetupError("Restore the saved private managed database addresses before starting.");
    privateFile(path);
    return { connectionString: state.connectionString!, directConnectionString: state.directConnectionString! };
  }
  // Pin the local database once used, so a later deployment never silently hides existing bookings.
  if (state.mode === "local") { report("Using the saved bundled local database; existing booking data stays in place."); return local; }
  if (!client) { state.mode = "local"; state.localReason = "no_key"; save(); return local; }
  if (state.pending) throw new DatabaseSetupError("Database setup could not be confirmed. Check its status before retrying; restore saved addresses if it completed.");
  state.pending = true; save();
  let result: Caps.DatabaseProvisionResult;
  try {
    result = await client.call(Cap.databaseProvision, {}, { idempotencyKey: state.key }) as Caps.DatabaseProvisionResult;
  } catch (error) {
    // Only a definite server refusal permits fallback. A lost response may contain the only credentials.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "upstream_unavailable" && "status" in error && typeof error.status === "number" && error.status >= 500) {
      state.mode = "local"; state.localReason = "unavailable"; state.pending = false; save(); report(fallback); return local;
    }
    const reason = setupRefusalReason(error);
    if (["request_key", "invalid_request", "unauthorized", "forbidden"].includes(reason)) {
      if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" && error.status >= 400 && error.status < 500) {
        state.pending = false; save();
      }
      throw new DatabaseSetupError(`Managed database setup was refused: ${setupRefusalText(reason)}.`);
    }
    throw new DatabaseSetupError("Managed database setup could not be confirmed. Check its status before retrying.");
  }
  if (result.status !== "ready" || !validAddress(result.connectionString) || !validAddress(result.directConnectionString)) {
    // The answer is definitive, not uncertain: a corrected start may proceed after recovery.
    state.pending = false; save();
    throw new DatabaseSetupError(
      "Managed database addresses were not returned in a usable form. No new database was selected; nothing was changed. Restore saved private settings, or rotate the database credentials once to receive fresh one-time addresses, then start again."
    );
  }
  state.mode = "managed"; state.pending = false;
  state.connectionString = result.connectionString; state.directConnectionString = result.directConnectionString; save();
  return { connectionString: result.connectionString!, directConnectionString: result.directConnectionString! };
}

function validAddress(value: unknown): value is string {
  if (typeof value !== "string" || /[\r\n]/.test(value)) return false;
  try { const url = new URL(value); return ["postgres:", "postgresql:"].includes(url.protocol) && Boolean(url.hostname && url.username && url.password); } catch { return false; }
}
