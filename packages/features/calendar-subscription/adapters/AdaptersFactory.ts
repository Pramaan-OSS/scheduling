import type { ICalendarSubscriptionPort } from "@scheduling/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
export type CalendarSubscriptionProvider = "primary_calendar";
export const GENERIC_CALENDAR_SUFFIXES = { primary_calendar: [] as string[] };
export interface AdapterFactory {
  get(provider: CalendarSubscriptionProvider): ICalendarSubscriptionPort;
  getProviders(): CalendarSubscriptionProvider[];
  getGenericCalendarSuffixes(): string[];
}

export class DefaultAdapterFactory implements AdapterFactory {
 get(_provider: CalendarSubscriptionProvider): ICalendarSubscriptionPort { throw new Error("Calendar subscriptions are not available yet. Busy time is checked when booking."); }
 getProviders(): CalendarSubscriptionProvider[] { return []; }
 getGenericCalendarSuffixes(): string[] { return []; }
}
