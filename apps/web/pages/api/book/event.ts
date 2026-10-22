import process from "node:process";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { getRegularBookingService } from "@scheduling/features/bookings/di/RegularBookingService.container";
import { BotDetectionService } from "@scheduling/features/bot-detection";
import { EventTypeRepository } from "@scheduling/features/eventtypes/repositories/eventTypeRepository";
import { FeaturesRepository } from "@scheduling/features/flags/features.repository";
import { checkRateLimitAndThrowError } from "@scheduling/lib/checkRateLimitAndThrowError";
import getIP from "@scheduling/lib/getIP";
import { checkCfProofToken } from "@scheduling/lib/server/checkCfProofToken";
import { defaultResponder } from "@scheduling/lib/server/defaultResponder";
import { piiHasher } from "@scheduling/lib/server/PiiHasher";
import type { TraceContext } from "@scheduling/lib/tracing";
import { prisma } from "@scheduling/prisma";
import { CreationSource } from "@scheduling/prisma/enums";
import type { NextApiRequest } from "next";

async function handler(req: NextApiRequest & { userId?: number; traceContext: TraceContext }) {
  const userIp = getIP(req);

  if (process.env.NEXT_PUBLIC_CHALLENGE_USE_PROOF_IN_BOOKER === "1") {
    await checkCfProofToken({
      token: req.body["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  // Check for bot detection using feature flag
  const featuresRepository = new FeaturesRepository(prisma);
  const eventTypeRepository = new EventTypeRepository(prisma);
  const botDetectionService = new BotDetectionService(featuresRepository, eventTypeRepository);

  await botDetectionService.checkBotDetection({
    eventTypeId: req.body.eventTypeId,
    headers: req.headers,
  });

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createBooking:${piiHasher.hash(userIp)}`,
  });

  const session = await getServerSession({ req });
  /* To mimic API behavior and comply with types */
  req.body = {
    ...req.body,
    creationSource: CreationSource.WEBAPP,
  };

  const regularBookingService = getRegularBookingService();
  const booking = await regularBookingService.createBooking({
    bookingData: req.body,
    bookingMeta: {
      userId: session?.user?.id || -1,
      hostname: req.headers.host || "",
      forcedSlug: req.headers["x-cal-force-slug"] as string | undefined,
      traceContext: req.traceContext,
    },
  });

  return booking;
}

export default defaultResponder(handler, "/api/book/event");
