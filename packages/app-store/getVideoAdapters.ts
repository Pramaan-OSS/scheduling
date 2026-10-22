import type { CredentialPayload } from "@scheduling/types/Credential";
import type { VideoApiAdapter } from "@scheduling/types/VideoApiAdapter";
export const getVideoAdapters = async (credentials: CredentialPayload[]): Promise<VideoApiAdapter[]> => {
  if (credentials.length) throw new Error("Meeting rooms are not available yet. Paste your meeting link in the location.");
  return [];
};
