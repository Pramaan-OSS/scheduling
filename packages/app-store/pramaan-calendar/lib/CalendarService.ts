import { createHash } from "node:crypto";
import { RRule } from "rrule";
import { Cap, zonedInstant, busyIntervals, requirePramaan, unavailableMessage, type Pramaan } from "@scheduling/pramaan";
import type { Calendar, CalendarServiceEvent, CalendarEvent, GetAvailabilityParams, NewCalendarEventType } from "@scheduling/types/Calendar";
import type { CredentialForCalendarService } from "@scheduling/types/Credential";

import { checkedAvailability } from "./availability";

export class PrimaryCalendar implements Calendar {
  readonly inbox: string;
  constructor(private credential: CredentialForCalendarService, private suppliedClient?: Pramaan) {
    const key = credential.key as { inbox?: string };
    if (!key?.inbox) throw new Error("Connect your primary calendar before checking availability.");
    this.inbox = key.inbox;
  }
  private client() { return this.suppliedClient || requirePramaan(); }
  getCredentialId() { return this.credential.id; }
  private async safely<T>(run: () => Promise<T>): Promise<T> {
    try { return await run(); } catch (error) { throw new Error(unavailableMessage(error)); }
  }
  private input(event: CalendarServiceEvent) {
    return {
      inbox: this.inbox, title: event.title,
      start: new Date(zonedInstant(event.startTime)).toISOString(),
      end: new Date(zonedInstant(event.endTime)).toISOString(), timezone: event.organizer?.timeZone || "UTC", allDay: false,
      ...(event.calendarDescription ? { description: event.calendarDescription } : {}),
      ...(event.location ? { location: event.location } : {}),
      attendees: event.attendees.map(({ email, name }) => ({ email, name })), sendInvites: false,
      ...(event.recurringEvent?.count ? { recurrence: { rule: new RRule(event.recurringEvent).toString().split("\n").find(line => line.startsWith("RRULE:")) || "" } } : {}),
    };
  }
  private identity(action: string, input: unknown) {
    return { idempotencyKey: `calendar-${createHash("sha256").update(JSON.stringify({ action, input })).digest("hex")}` };
  }
  private result(ref: string, event: CalendarEvent): NewCalendarEventType {
    return { uid: ref, id: ref, type: "pramaan_calendar", password: "", url: "", additionalInfo: {}, location: event.location || null };
  }
  createEvent(event: CalendarServiceEvent) {
    return this.safely(async () => {
      const input = { ...this.input(event), metadata: { booking: event.uid || "booking" } };
      const result = await this.client().calendarEventCreate(input, this.identity("create", input));
      if (!result.ref) throw new Error("Calendar write was not confirmed.");
      return this.result(result.ref, event);
    });
  }
  updateEvent(ref: string, event: CalendarServiceEvent) {
    return this.safely(async () => {
      const fields = this.input(event);
      const input = { ...fields, ref, description: event.calendarDescription || null, location: event.location || null };
      const result = await this.client().call(Cap.calendarEventUpdate, input, this.identity("update", input)) as { kind?: string };
      if (!result.kind) throw new Error("Calendar write was not confirmed.");
      return this.result(ref, event);
    });
  }
  deleteEvent(ref: string, _event: CalendarEvent) {
    return this.safely(async () => {
      const input = { inbox: this.inbox, ref, sendInvites: false };
      const result = await this.client().call(Cap.calendarEventDelete, input, this.identity("delete", input)) as { deleted?: boolean };
      if (result.deleted !== true) throw new Error("Calendar deletion was not confirmed.");
      return result;
    });
  }
  getAvailability({ dateFrom, dateTo }: GetAvailabilityParams) {
    return checkedAvailability(this.client(), { inbox: this.inbox, names: (this.credential.key as { checkedCalendars?: string[] }).checkedCalendars, start: new Date(zonedInstant(dateFrom)).toISOString(), end: new Date(zonedInstant(dateTo)).toISOString(), timezone: (this.credential.key as { timezone?: string }).timezone || "UTC" });
  }
  async getAvailabilityWithTimeZones(params: GetAvailabilityParams) {
    return (await this.getAvailability(params)).map(row => ({ ...row, timeZone: "UTC" }));
  }
  listCalendars() {
    return this.safely(async () => {
      const result = await this.client().call(Cap.calendarCalendarsList, { inbox: this.inbox, limit: 50 }) as { results?: { name: string; isPrimary?: boolean; readOnly?: boolean }[] };
      const primary = result.results?.find(row => row.isPrimary) || (result.results?.length === 1 ? result.results[0] : undefined);
      if (!primary) throw new Error("Primary calendar could not be confirmed.");
      return [{ externalId: this.inbox, name: "Primary calendar", integration: "pramaan_calendar", primary: true, readOnly: primary.readOnly || false, credentialId: this.credential.id }];
    });
  }
}
export default (credential: CredentialForCalendarService) => new PrimaryCalendar(credential);
