import type { Calendar, CalendarFetchMode } from "@scheduling/types/Calendar";
import type { CredentialForCalendarService } from "@scheduling/types/Credential";
import createPrimaryCalendar from "../pramaan-calendar/lib/CalendarService";

export const getCalendar = async (credential: CredentialForCalendarService | null, _mode: CalendarFetchMode = "none"): Promise<Calendar | null> => {
  if (!credential) return null;
  if (credential.type === "pramaan_calendar") return createPrimaryCalendar(credential);
  if (credential.type === "ics-feed_calendar") {
    const { default: createFeedCalendar } = await import("../ics-feedcalendar/lib/CalendarService");
    return createFeedCalendar(credential);
  }
  throw new Error("This calendar connection is not available yet. Connect your primary calendar.");
};
