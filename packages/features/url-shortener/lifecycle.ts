import { createHash } from "node:crypto";
import { PramaanError, type Pramaan } from "@scheduling/pramaan";
import { supportsFallback } from "@scheduling/app-store/pramaan-calendar/lib/availability";

export type LinkRecord = { id: string; status: string; destinationUrl: string; app: string; ref?: string; shortUrl?: string; operation?: string; message?: string };
export interface LinkStore {
  get(id: string): Promise<LinkRecord | null>;
  claim(row: LinkRecord, previous?: string): Promise<boolean>;
  save(row: LinkRecord, expected: string): Promise<boolean>;
}
export const linkId = (destination: string) => createHash("sha256").update(destination).digest("hex");
export function plainUrl(value: unknown): value is string {
  try { const url = new URL(String(value)); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
const fallback = "Short links are not available yet on this connection. Use the product's own URL.";
const uncertain = "The short-link change could not be confirmed. Use the product's own URL and check the connected app before further action.";
function definite(error: unknown) { return supportsFallback(error) && error instanceof PramaanError && !error.retryable && !error.jobId; }
export async function shortenOwned(store: LinkStore, client: Pramaan, owner: number, app: string, destinationUrl: string) {
  if (!plainUrl(destinationUrl)) throw new Error("Use a valid booking URL.");
  const id = linkId(destinationUrl), existing = await store.get(id);
  if (existing) return { shortLink: existing.status === "ready" && existing.destinationUrl === destinationUrl ? existing.shortUrl! : destinationUrl, message: existing.message || (existing.status === "ready" ? "" : uncertain) };
  const operation = `short-${owner}-${linkId(`${app}:${destinationUrl}`)}`, row: LinkRecord = { id, status: "creating", app, destinationUrl, operation };
  if (!await store.claim(row)) return { shortLink: destinationUrl, message: "This link is already being checked. Use the product's own URL." };
  try {
    const result = await client.shortLinkCreate({ endUserRef: `host_${owner}`, app, destinationUrl }, { idempotencyKey: operation });
    if (!plainUrl(result.shortUrl) || result.destinationUrl !== destinationUrl || !/^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$/.test(result.ref || "")) throw new Error("Creation not confirmed.");
    if (!await store.save({ ...row, ref: result.ref, shortUrl: result.shortUrl, status: "ready" }, operation)) throw new Error("Storage not confirmed.");
    return { shortLink: result.shortUrl, message: "" };
  } catch (error) {
    const message = definite(error) ? fallback : uncertain;
    await store.save({ ...row, status: definite(error) ? "fallback" : "uncertain", message }, operation);
    return { shortLink: destinationUrl, message };
  }
}
export async function changeOwned(store: LinkStore, client: Pramaan, owner: number, id: string, action: "update" | "delete", destinationUrl?: string) {
  const row = await store.get(id);
  if (!row || row.status !== "ready" || !row.ref) throw new Error("Check the previous short-link request in the connected app first.");
  if (action === "update" && !plainUrl(destinationUrl)) throw new Error("Use a valid booking URL.");
  const operation = `short-${owner}-${linkId(`${row.ref}:${row.operation}:${action}:${destinationUrl || ""}`)}`;
  if (!await store.claim({ ...row, status: "changing", operation }, row.operation)) throw new Error("This link is already being changed.");
  try {
    if (action === "delete") {
      const result = await client.shortLinkDelete({ endUserRef: `host_${owner}`, ref: row.ref, confirm: true }, { idempotencyKey: operation });
      if (result.deleted !== true) throw new Error("Deletion not confirmed.");
      if (!await store.save({ ...row, status: "deleted", operation, message: "Short link deleted. Use the product's own URL." }, operation)) throw new Error("Storage not confirmed.");
    } else {
      const result = await client.shortLinkUpdate({ endUserRef: `host_${owner}`, ref: row.ref, destinationUrl: destinationUrl! }, { idempotencyKey: operation });
      if (result.destinationUrl !== destinationUrl || !plainUrl(result.shortUrl)) throw new Error("Update not confirmed.");
      if (!await store.save({ ...row, status: "ready", destinationUrl: destinationUrl!, shortUrl: result.shortUrl, operation, message: "" }, operation)) throw new Error("Storage not confirmed.");
    }
    return { message: action === "delete" ? "Short link deleted." : "Short link updated." };
  } catch (error) {
    const message = definite(error) ? fallback : uncertain;
    await store.save({ ...row, status: definite(error) ? "fallback" : "uncertain", operation, message }, operation);
    return { message };
  }
}
