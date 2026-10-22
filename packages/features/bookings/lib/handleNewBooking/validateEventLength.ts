import type { Logger } from "tslog";

import dayjs from "@scheduling/dayjs";
import { HttpError } from "@scheduling/lib/http-error";
import { withReporting } from "@scheduling/lib/tracingWrapper";

type Props = {
  reqBodyStart: string;
  reqBodyEnd: string;
  eventTypeMultipleDuration?: number[];
  eventTypeLength: number;
  logger: Logger<unknown>;
};

// Define the function with underscore prefix
const _validateEventLength = ({
  reqBodyStart,
  reqBodyEnd,
  eventTypeMultipleDuration,
  eventTypeLength,
  logger,
}: Props) => {
  const reqEventLength = dayjs(reqBodyEnd).diff(dayjs(reqBodyStart), "minutes");
  const validEventLengths = eventTypeMultipleDuration?.length ? eventTypeMultipleDuration : [eventTypeLength];
  if (!validEventLengths.includes(reqEventLength)) {
    logger.warn({ message: "NewBooking: Invalid event length" });
    throw new HttpError({ statusCode: 400, message: "Invalid event length" });
  }
};

export const validateEventLength = withReporting(_validateEventLength, "validateEventLength");
