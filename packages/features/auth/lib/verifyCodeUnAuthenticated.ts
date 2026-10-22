import { createHash } from "node:crypto";

import { checkRateLimitAndThrowError } from "@scheduling/lib/checkRateLimitAndThrowError";
import { hashEmail } from "@scheduling/lib/server/PiiHasher";
import { totpRawCheck } from "@scheduling/lib/totp";

export const verifyCodeUnAuthenticated = async (email: string, code: string) => {
  if (!email || !code) {
    throw new Error("Email and code are required");
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `emailVerifyCode.${hashEmail(email)}`,
  });

  const secret = createHash("md5")
    .update(email + (process.env.SCHEDULING_ENCRYPTION_KEY || ""))
    .digest("hex");

  const isValidToken = totpRawCheck(code, secret, { step: 900 });

  if (!isValidToken) {
    throw new Error("Invalid verification code");
  }

  return true;
};
