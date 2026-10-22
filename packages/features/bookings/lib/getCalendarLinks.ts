import type { TFunction } from "i18next";
import { createEvent } from "ics";
import type { z } from "zod";

import type { Dayjs } from "@scheduling/dayjs";
import dayjs from "@scheduling/dayjs";
import type { Prisma } from "@scheduling/prisma/client";
import type { nameObjectSchema } from "@scheduling/features/eventtypes/lib/eventNaming";
import { getEventName } from "@scheduling/features/eventtypes/lib/eventNaming";
import { bookingMetadataSchema } from "@scheduling/prisma/zod-utils";
import type { RecurringEvent } from "@scheduling/types/Calendar";

type RecurringEventOrPrismaJsonObject = RecurringEvent | Prisma.JsonObject | null | undefined;
export const enum CalendarLinkType {
  ICS = "ics",
}

const buildICalLink = ({
  startTime,
  endTime,
  title,
  description,
  location,
}: {
  startTime: Dayjs;
  endTime: Dayjs;
  title: string;
  description: string | null;
  location: string | null;
}) => {
  const durationInMinutes = endTime.diff(startTime, "minutes");

  const iCalEvent = createEvent({
    start: [
      startTime.toDate().getUTCFullYear(),
      (startTime.toDate().getUTCMonth() as number) + 1,
      startTime.toDate().getUTCDate(),
      startTime.toDate().getUTCHours(),
      startTime.toDate().getUTCMinutes(),
    ],
    startInputType: "utc",
    title,
    duration: {
      minutes: durationInMinutes,
    },
    ...(description ? { description } : {}),
    ...(location ? { location } : {}),
  });

  if (iCalEvent.error) {
    throw iCalEvent.error;
  }

  return `data:text/calendar,${encodeURIComponent(iCalEvent.value ? iCalEvent.value : false)}`;
};

export const getCalendarLinks = ({
  booking,
  eventType,
  t,
}: {
  booking: {
    startTime: Date;
    endTime: Date;
    location: string | null;
    title: string;
    responses: Prisma.JsonObject;
    metadata: Prisma.JsonObject | null;
  };
  eventType: {
    recurringEvent: RecurringEventOrPrismaJsonObject;
    description?: string | null;
    eventName?: string | null;
    isDynamic: boolean;
    length: number;
    team?: {
      name: string;
    } | null;
    users: {
      name: string | null;
    }[];
    title: string;
  };
  t: TFunction;
}) => {
  let evtName = eventType.eventName;
  const videoCallUrl = bookingMetadataSchema.parse(booking?.metadata || {})?.videoCallUrl ?? null;

  if (eventType.isDynamic && booking.responses.title) {
    evtName = booking.responses.title as string;
  }
  const eventNameObject = {
    attendeeName: booking.responses.name as z.infer<typeof nameObjectSchema> | string,
    eventType: eventType.title,
    eventName: evtName,
    host: eventType.team?.name || eventType.users[0]?.name || "Nameless",
    location: booking.location,
    bookingFields: booking.responses,
    eventDuration: dayjs(booking.endTime).diff(booking.startTime, "minutes"),
    t,
  };

  // Create event name and description
  const eventName = getEventName(eventNameObject, true);
  const eventDescription = eventType.description || "";

  // Calculate start and end times
  const startTime = dayjs(booking.startTime);
  const endTime = dayjs(booking.endTime);
  const recurringEvent = eventType.recurringEvent;

  // Generate ICS file link
  let icsFileLink = "";
  try {
    icsFileLink = buildICalLink({
      startTime,
      endTime,
      title: eventName,
      description: eventDescription ?? null,
      location: booking.location ?? videoCallUrl ?? null,
    });
  } catch (error) {
    console.error("Error generating ICS file", error);
  }

  return [
    {
      label: "Add to calendar",
      id: CalendarLinkType.ICS,
      link: icsFileLink,
    },
  ];
};
