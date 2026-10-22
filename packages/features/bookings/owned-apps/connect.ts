import { createHash } from "node:crypto";
import { Cap, PramaanError, type Pramaan } from "@scheduling/pramaan";
export const CHECK_CONNECTION = "The connection request could not be confirmed. Check your connected account before trying again.";
export const CALENDAR_CONNECTION_APPS = ["googlecalendar", "outlook"] as const;
export type ConnectionIntent = { idempotencyKey: string; status: "starting" | "done" | "refused" | "uncertain" };
export async function startOwnedConnection(client: Pramaan, input: { app: string; endUserRef: string; redirectUrl: string }, store: { get(): Promise<ConnectionIntent | undefined>; save(intent: ConnectionIntent): Promise<void> }) {
  // Production currently accepts standard app access only. Consent does not prove change access.
  const request = { app: input.app, endUserRef: input.endUserRef, redirectUrl: input.redirectUrl };
  const previous = await store.get();
  const idempotencyKey = `owned-connect-${createHash("sha256").update(JSON.stringify(request)).digest("hex")}`;
  if (previous && ["starting", "uncertain"].includes(previous.status)) throw new Error(CHECK_CONNECTION);
  if (previous?.status === "done" && previous.idempotencyKey === idempotencyKey) throw new Error("This connection was already requested. Refresh settings to check it.");
  await store.save({ idempotencyKey, status: "starting" });
  try {
    const result = await client.call(Cap.appsConnectionStart, request, { idempotencyKey }) as { connectUrl?: string };
    if (!result.connectUrl || new URL(result.connectUrl).protocol !== "https:") throw new Error(CHECK_CONNECTION);
    await store.save({ idempotencyKey, status: "done" });
    return result.connectUrl;
  } catch (error) {
    const refused = error instanceof PramaanError && typeof error.status === "number" && error.status >= 400 && error.status < 500;
    await store.save({ idempotencyKey, status: refused ? "refused" : "uncertain" });
    throw new Error(CHECK_CONNECTION);
  }
}
