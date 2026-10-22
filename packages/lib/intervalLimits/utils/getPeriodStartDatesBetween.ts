import type { Dayjs } from "@scheduling/dayjs";
import dayjs from "@scheduling/dayjs";
import { withReporting } from "@scheduling/lib/tracingWrapper";

import type { IntervalLimitUnit } from "../intervalLimitSchema";

function _getPeriodStartDatesBetween(
  dateFrom: Dayjs,
  dateTo: Dayjs,
  period: IntervalLimitUnit,
  timeZone?: string
): Dayjs[] {
  const dates = [];
  let startDate = timeZone ? dayjs(dateFrom).tz(timeZone).startOf(period) : dayjs(dateFrom).startOf(period);
  const endDate = timeZone ? dayjs(dateTo).tz(timeZone).endOf(period) : dayjs(dateTo).endOf(period);

  while (startDate.isBefore(endDate)) {
    dates.push(startDate);
    startDate = startDate.add(1, period);
  }
  return dates;
}

export const getPeriodStartDatesBetween = withReporting(
  _getPeriodStartDatesBetween,
  "getPeriodStartDatesBetween"
);
