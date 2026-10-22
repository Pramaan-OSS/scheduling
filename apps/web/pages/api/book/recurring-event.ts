import process from "node:process";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { getRecurringBookingService } from "@scheduling/features/bookings/di/RecurringBookingService.container";
import type { BookingResponse } from "@scheduling/features/bookings/types";
import { checkRateLimitAndThrowError } from "@scheduling/lib/checkRateLimitAndThrowError";
import getIP from "@scheduling/lib/getIP";
import { checkCfProofToken } from "@scheduling/lib/server/checkCfProofToken";
import { defaultResponder } from "@scheduling/lib/server/defaultResponder";
import { piiHasher } from "@scheduling/lib/server/PiiHasher";
import type { NextApiRequest } from "next";

// @TODO: Didn't look at the contents of this function in order to not break old booking page.

type PlatformParams = {
  platformClientId?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  platformRescheduleUrl?: string;
  platformBookingLocation?: string;
};

type RequestMeta = {
  userId?: number;
  hostname?: string;
  forcedSlug?: string;
  noEmail?: boolean;
} & PlatformParams;

async function handler(req: NextApiRequest & RequestMeta) {
  const userIp = getIP(req);

  if (process.env.NEXT_PUBLIC_CHALLENGE_USE_PROOF_IN_BOOKER === "1") {
    await checkCfProofToken({
      token: req.body[0]["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createRecurringBooking:${piiHasher.hash(userIp)}`,
  });
  const session = await getServerSession({ req });
  /* To mimic API behavior and comply with types */

  const recurringBookingService = getRecurringBookingService();
  const createdBookings: BookingResponse[] = await recurringBookingService.createBooking({
    bookingData: req.body,
    bookingMeta: {
      userId: session?.user?.id || -1,
      platformClientId: req.platformClientId,
      platformCancelUrl: req.platformCancelUrl,
      platformBookingUrl: req.platformBookingUrl,
      platformRescheduleUrl: req.platformRescheduleUrl,
      platformBookingLocation: req.platformBookingLocation,
      noEmail: req.noEmail,
    },
    creationSource: "WEBAPP",
  });

  return createdBookings;
}

export const handleRecurringEventBooking = handler;

export default defaultResponder(handler);
