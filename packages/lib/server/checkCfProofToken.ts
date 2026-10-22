import { HttpError } from "../http-error";
import { verifyChallenge } from "../integrations/verification";
export const INVALID_CHALLENGE_TOKEN_ERROR = "The challenge could not be verified.";
export async function checkCfProofToken({ token, remoteIp }: { token?: string; remoteIp: string }) {
  if (process.env.SCHEDULING_BOT_CHECK_ENABLED !== "1") return { success: true, checked: false };
  if (!token) throw new HttpError({ statusCode: 422, message: "Challenge verification is not available yet. Ask your administrator to configure it." });
  try { return await verifyChallenge({ token, remoteIp }); }
  catch (error) { throw new HttpError({ statusCode: 422, message: error instanceof Error ? error.message : "This feature is not available yet." }); }
}
