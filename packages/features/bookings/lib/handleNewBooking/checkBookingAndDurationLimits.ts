import dayjs from "@scheduling/dayjs";
import type { CheckBookingLimitsService } from "@scheduling/features/bookings/lib/checkBookingLimits";
import { checkDurationLimits } from "@scheduling/features/bookings/lib/checkDurationLimits";
import type { IntervalLimit } from "@scheduling/lib/intervalLimits/intervalLimitSchema";
import { withReporting } from "@scheduling/lib/tracingWrapper";

import type { NewBookingEventType } from "./getEventTypesFromDB";

type EventType = Pick<NewBookingEventType, "bookingLimits" | "durationLimits" | "id" | "schedule">;

type InputProps = {
  eventType: EventType;
  reqBodyStart: string;
  reqBodyRescheduleUid?: string;
};

export interface ICheckBookingAndDurationLimitsService {
  checkBookingLimitsService: CheckBookingLimitsService;
}

export class CheckBookingAndDurationLimitsService {
  constructor(private readonly dependencies: ICheckBookingAndDurationLimitsService) {}

  checkBookingAndDurationLimits = withReporting(
    this._checkBookingAndDurationLimits.bind(this),
    "checkBookingAndDurationLimits"
  );

  async _checkBookingAndDurationLimits({ eventType, reqBodyStart, reqBodyRescheduleUid }: InputProps) {
    if (
      Object.prototype.hasOwnProperty.call(eventType, "bookingLimits") ||
      Object.prototype.hasOwnProperty.call(eventType, "durationLimits")
    ) {
      const startAsDate = dayjs(reqBodyStart).toDate();
      if (eventType.bookingLimits && Object.keys(eventType.bookingLimits).length > 0) {
        await this.dependencies.checkBookingLimitsService.checkBookingLimits(
          eventType.bookingLimits as IntervalLimit,
          startAsDate,
          eventType.id,
          reqBodyRescheduleUid,
          eventType.schedule?.timeZone
        );
      }
      if (eventType.durationLimits) {
        await checkDurationLimits(
          eventType.durationLimits as IntervalLimit,
          startAsDate,
          eventType.id,
          reqBodyRescheduleUid
        );
      }
    }
  }
}
