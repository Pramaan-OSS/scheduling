import type { CredentialPayload } from "@scheduling/types/Credential";
import type { CRM } from "@scheduling/types/CrmService";
export default async function getCrm(_credential: CredentialPayload, _options?: unknown): Promise<CRM | null> {
  throw new Error("This legacy CRM connection is not available yet. Use a connected-app action.");
}
