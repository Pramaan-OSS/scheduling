import type { DestinationCalendar } from "@scheduling/prisma/client";
export default function processExternalId(calendar: DestinationCalendar) { return calendar.externalId; }
