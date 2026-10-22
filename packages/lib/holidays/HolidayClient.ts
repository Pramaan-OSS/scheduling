import { createHash } from "node:crypto";
import { Cap, requirePramaan, unavailableMessage, type Pramaan } from "@scheduling/pramaan";
export interface CalendarHoliday { id: string; countryCode: string; eventId: string; name: string; date: Date; year: number }
export class HolidayClient {
  constructor(private client?: Pramaan) {}
  async fetchHolidays(countryCode: string, year: number): Promise<CalendarHoliday[]> {
    try {
      const response = await (this.client || requirePramaan()).call(Cap.timeHolidaysList, { countryCode, year }) as { holidays?: { name?: string; date?: string }[]; totalHolidays?: number };
      if (!Array.isArray(response.holidays) || response.totalHolidays !== response.holidays.length) throw new Error("Holiday data could not be confirmed.");
      return response.holidays.map(row => {
        if (!row.name || !row.date || !Number.isFinite(Date.parse(row.date))) throw new Error("Holiday data could not be confirmed.");
        const eventId = createHash("sha256").update(`${countryCode}:${row.date}:${row.name}`).digest("hex");
        return { id: eventId, countryCode, eventId, name: row.name, date: new Date(row.date), year };
      });
    } catch (error) { throw new Error(unavailableMessage(error)); }
  }
}
export function getHolidayClient() { return new HolidayClient(); }
