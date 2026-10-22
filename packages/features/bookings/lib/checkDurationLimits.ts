import dayjs from "@scheduling/dayjs";
import { BookingRepository } from "@scheduling/features/bookings/repositories/BookingRepository";
import { getErrorFromUnknown } from "@scheduling/lib/errors";
import { HttpError } from "@scheduling/lib/http-error";
import { ascendingLimitKeys, intervalLimitKeyToUnit } from "@scheduling/lib/intervalLimits/intervalLimit";
import type { IntervalLimit, IntervalLimitKey } from "@scheduling/lib/intervalLimits/intervalLimitSchema";
import { parseDurationLimit } from "@scheduling/lib/intervalLimits/isDurationLimits";
import prisma from "@scheduling/prisma";

export async function checkDurationLimits(
  durationLimits: IntervalLimit,
  eventStartDate: Date,
  eventId: number,
  rescheduleUid?: string
) {
  const parsedDurationLimits = parseDurationLimit(durationLimits);
  if (!parsedDurationLimits) return false;

  // not iterating entries to preserve types
  const limitCalculations = ascendingLimitKeys.map((key) =>
    checkDurationLimit({
      key,
      limitingNumber: parsedDurationLimits[key],
      eventStartDate,
      eventId,
      rescheduleUid,
    })
  );

  try {
    return !!(await Promise.all(limitCalculations));
  } catch (error) {
    throw new HttpError({ message: getErrorFromUnknown(error).message, statusCode: 401 });
  }
}

export async function checkDurationLimit({
  eventStartDate,
  eventId,
  key,
  limitingNumber,
  rescheduleUid,
}: {
  eventStartDate: Date;
  eventId: number;
  key: IntervalLimitKey;
  limitingNumber: number | undefined;
  rescheduleUid?: string;
}) {
  {
    if (!limitingNumber) return;

    const unit = intervalLimitKeyToUnit(key);

    const startDate = dayjs(eventStartDate).startOf(unit).toDate();
    const endDate = dayjs(eventStartDate).endOf(unit).toDate();

    const bookingRepo = new BookingRepository(prisma);
    const totalBookingDuration = await bookingRepo.getTotalBookingDuration({
      eventId,
      startDate,
      endDate,
      rescheduleUid,
    });

    if (totalBookingDuration < limitingNumber) return;

    throw new HttpError({
      message: `duration_limit_reached`,
      statusCode: 403,
    });
  }
}
