import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import { NextResponse, type NextRequest } from "next/server";

import selfHostedSignupHandler from "./handlers/selfHostedHandler";
import { FeaturesRepository } from "@scheduling/features/flags/features.repository";
import { checkRateLimitAndThrowError } from "@scheduling/lib/checkRateLimitAndThrowError";
import getIP from "@scheduling/lib/getIP";
import { HttpError } from "@scheduling/lib/http-error";
import logger from "@scheduling/lib/logger";
import { piiHasher } from "@scheduling/lib/server/PiiHasher";
import { checkCfProofToken } from "@scheduling/lib/server/checkCfProofToken";
import { prisma } from "@scheduling/prisma";
import { signupSchema } from "@scheduling/prisma/zod-utils";

async function ensureSignupIsEnabled(body: Record<string, string>) {
  const { token } = signupSchema
    .pick({
      token: true,
    })
    .parse(body);

  // Still allow signups if there is a team invite
  if (token) return;

  const featuresRepository = new FeaturesRepository(prisma);
  const signupDisabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("disable-signup");

  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true" || signupDisabled) {
    throw new HttpError({
      statusCode: 403,
      message: "Signup is disabled",
    });
  }
}

async function handler(req: NextRequest) {
  const remoteIp = getIP(req);
  // Use a try catch instead of returning res every time
  try {
    // Rate limit: 10 signups per 60 seconds per IP
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `api:signup:${piiHasher.hash(remoteIp)}`,
    });

    const body = await parseRequestData(req);
    await checkCfProofToken({
      token: req.headers.get("cf-access-token") as string,
      remoteIp,
    });

    await ensureSignupIsEnabled(body);

    return await selfHostedSignupHandler(body);
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.statusCode });
    }
    logger.error(e);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(handler);
