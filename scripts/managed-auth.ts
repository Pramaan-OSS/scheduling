import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { isIP } from "node:net";
import { Cap, type Pramaan } from "../packages/pramaan/src/index";
import { setupRefusalReason, managedAuthMessage } from "./setup-refusal.mjs";
import { savePrivateState } from "./private-state";

export type ManagedAuth = { status: "ready"; authUrl: string; jwksUrl: string; origin: string };
export function secureAddress(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.hash && !url.search; } catch { return false; }
}
export async function authForStart(root: string, client: Pramaan | null, appUrl: string, report = console.log): Promise<ManagedAuth | undefined> {
  const origin = new URL(appUrl).origin;
  const path = resolve(root, ".runtime/managed-auth.json");
  mkdirSync(resolve(root, ".runtime"), { recursive: true, mode: 0o700 });
  let state: { key: string; authUrl?: string; jwksUrl?: string; origin?: string; status?: string; registeredOrigin?: string; failureReason?: string } = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { key: randomUUID() };
  const save = () => savePrivateState(path, state);
  if (!client) { state.status = "disabled"; save(); return undefined; }
  try {
    if (!state.key) throw new Error("Missing saved sign-in request key.");
    save();
    if (!secureAddress(state.authUrl) || !secureAddress(state.jwksUrl)) {
      const result = await client.call(Cap.authBackendProvision, {}, { idempotencyKey: state.key }) as { status?: string; authUrl?: string; jwksUrl?: string };
      if (result.status !== "ready" || !secureAddress(result.authUrl) || !secureAddress(result.jwksUrl)) throw new Error("Invalid sign-in configuration.");
      state.authUrl = result.authUrl; state.jwksUrl = result.jwksUrl; save();
    }
    const url = new URL(origin);
    const publicAddress = url.protocol === "https:" && !isIP(url.hostname.replace(/^\[|\]$/g, "")) && url.hostname.includes(".") && !/(^localhost$|\.localhost$|\.local$)/i.test(url.hostname);
    if (publicAddress) {
      if (state.registeredOrigin !== origin) {
        const registered = await client.call(Cap.authBackendDomainsSet, { domains: [origin] }, { idempotencyKey: `${state.key}-${createHash("sha256").update(origin).digest("hex")}` }) as { allowedDomains?: Array<string | { domain?: string }> };
        if (!registered.allowedDomains?.some(row => (typeof row === "string" ? row : row.domain) === origin)) throw new Error("The app address was not confirmed.");
        state.registeredOrigin = origin;
      }
    } else report("Local development address: managed sign-in domain registration is not needed.");
    delete state.failureReason;
    state.status = "ready"; state.origin = origin; save();
    return state as ManagedAuth;
  } catch (error) {
    state.failureReason = setupRefusalReason(error);
    state.status = "unavailable"; save();
    report(managedAuthMessage(state.failureReason));
    return undefined;
  }
}
