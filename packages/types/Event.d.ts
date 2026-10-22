import type { EventType } from "@scheduling/prisma/client";
import type { NewCalendarEventType, AdditionalInformation } from "@scheduling/types/Calendar";

import type { CrmData } from "./CrmService";
import type { VideoCallData } from "./VideoApiAdapter";

export type Event = AdditionalInformation | NewCalendarEventType | VideoCallData | CrmData;

export type PeriodData = Pick<
  EventType,
  "periodType" | "periodStartDate" | "periodEndDate" | "periodDays" | "periodCountCalendarDays"
>;
