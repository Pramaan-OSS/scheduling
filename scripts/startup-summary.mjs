import { managedAuthMessage } from "./setup-refusal.mjs";
import { readFileSync } from "node:fs";
function state(name) { try { return JSON.parse(readFileSync(`.runtime/${name}.json`, "utf8")); } catch { return {}; } }
const database = state("managed-database");
if (database.mode === "local") console.log(database.localReason === "unavailable" ? "Managed database setup was unavailable; using the bundled local database." : "Using the saved bundled local database; existing booking data stays in place.");
const auth = state("managed-auth");
if (auth.status === "unavailable") console.log(managedAuthMessage(auth.failureReason));
else if (auth.status === "ready" && auth.origin !== auth.registeredOrigin) console.log("Local development address: managed sign-in domain registration is not needed.");
