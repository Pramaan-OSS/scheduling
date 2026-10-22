import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { Cap, pramaanFromEnv, type Pramaan } from "@scheduling/pramaan";

export type ManagedSettings = { authUrl: string; jwksUrl: string; origin: string };
export function managedSettings(): ManagedSettings | null {
  if (!pramaanFromEnv()) return null;
  try {
    const state = JSON.parse(readFileSync(resolve(process.env.SCHEDULING_RUNTIME_DIR || ".runtime", "managed-auth.json"), "utf8"));
    if (state.status !== "ready" || !state.origin || !state.authUrl || !state.jwksUrl) return null;
    return { authUrl: state.authUrl, jwksUrl: state.jwksUrl, origin: state.origin };
  } catch { return null; }
}

export async function verifyManagedSignIn(token: string, settings: ManagedSettings, client: Pramaan) {
  const refused = () => new Error("Managed sign-in could not be verified. Start sign-in again.");
  try {
    if (!token || token.length > 8192) throw refused();
    const verified = await client.call(Cap.authTokenVerify, { token, audience: new URL(settings.authUrl).origin, authorizedParties: [settings.origin] }) as { valid?: boolean; userId?: string };
    if (verified.valid !== true || !verified.userId) throw refused();
    const parts = token.split(".");
    if (parts.length !== 3 || !parts.every(Boolean)) throw refused();
    const user = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!user || Array.isArray(user) || user.sub !== verified.userId || typeof user.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) throw refused();
    return { subject: `managed:${createHash("sha256").update(new URL(settings.authUrl).origin).digest("hex")}:${verified.userId}`, email: user.email.toLowerCase(), emailVerified: user.emailVerified === true, name: typeof user.name === "string" && user.name ? user.name : user.email };
  } catch { throw refused(); }
}
