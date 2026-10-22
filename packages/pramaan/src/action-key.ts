import { capabilityInfo } from "./catalog";
import { PramaanError } from "./sdk/errors";

/** Action identities belong to the caller and must survive an uncertain answer. */
export function requireActionKey(id: string, key: unknown): void {
  const info = capabilityInfo(id);
  if ((info && info.effectClass !== "read_only") || id === "auth.user.delete") {
    if (typeof key !== "string" || !key.trim())
      throw new PramaanError("invalid_request", "Idempotency-Key header is required for this capability.", { status: 400 });
  }
}
