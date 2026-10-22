import type { TFunction } from "i18next";
import type { EventStatus } from "ics";

import type { CalendarEvent } from "@scheduling/types/Calendar";

import { getRichDescription, getVideoCallUrlFromCalEvent } from "@scheduling/lib/CalEventParser";
import { zonedInstant, type Caps } from "@scheduling/pramaan";

import generateIcsString from "./generateIcsString";

export enum GenerateIcsRole {
  ATTENDEE = "attendee",
  ORGANIZER = "organizer",
}

export default function generateIcsFile({
  calEvent,
  role,
  status,
  t,
}: {
  calEvent: CalendarEvent;
  role: GenerateIcsRole;
  status: EventStatus;
  t?: TFunction;
}) {
  return {
    filename: "event.ics",
    invitation: bookingInvitation(calEvent, status, t),
    content: generateIcsString({
      event: calEvent,
      status,
      t,
    }),
    method: status === "CANCELLED" ? "CANCEL" : "REQUEST",
  };
}

// Envelope sender and visible recipients are supplied by the dispatcher, not the host's private address.
export function bookingInvitation(event: CalendarEvent, status: EventStatus, t?: TFunction):
  Omit<Caps.EmailInvitation, "organiser" | "attendees"> {
  const uid = event.iCalUID || event.uid;
  if (!uid) throw new Error("A booking identifier is required for its invitation.");
  const wholeSeconds = (time: string) => new Date(zonedInstant(time)).toISOString().replace(/\.\d{3}Z$/, "Z");
  const location = getVideoCallUrlFromCalEvent(event) || event.location;
  const description = getRichDescription(event, t);
  return {
    uid, title: event.title, start: wholeSeconds(event.startTime), end: wholeSeconds(event.endTime),
    timeZone: event.organizer.timeZone,
    method: status === "CANCELLED" ? "cancel" : "request",
    sequence: status === "CANCELLED" ? Math.max(1, event.iCalSequence ?? 0) : event.iCalSequence ?? 0,
    ...(location ? { location } : {}), ...(description ? { description } : {}),
  };
}
