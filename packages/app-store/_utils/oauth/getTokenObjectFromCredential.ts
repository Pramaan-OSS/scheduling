import logger from "@scheduling/lib/logger";
import { safeStringify } from "@scheduling/lib/safeStringify";
import type { CredentialPayload } from "@scheduling/types/Credential";

import { OAuth2TokenResponseInDbSchema } from "./universalSchema";

export function getTokenObjectFromCredential(credential: Pick<CredentialPayload, "key" | "id">) {
  const parsedTokenResponse = OAuth2TokenResponseInDbSchema.safeParse(credential.key);
  if (!parsedTokenResponse.success) {
    logger.error(
      "Calendar credential could not be read",
      safeStringify(parsedTokenResponse.error.issues)
    );
    throw new Error(
      `Could not parse credential.key ${credential.id} with error: ${parsedTokenResponse?.error}`
    );
  }

  const tokenResponse = parsedTokenResponse.data;
  if (!tokenResponse) {
    throw new Error(`credential.key is not set for credential ${credential.id}`);
  }

  return tokenResponse;
}
