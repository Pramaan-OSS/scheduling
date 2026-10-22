import dayjs from "@scheduling/dayjs";
import { HolidayRepository } from "@scheduling/features/holidays/repositories/HolidayRepository";

import { HOLIDAY_COUNTRIES, HOLIDAY_CACHE_DAYS } from "./constants";
import {
  getHolidayClient,
  type HolidayClient,
  type CalendarHoliday,
} from "./HolidayClient";

export interface CachedHoliday {
  id: string;
  countryCode: string;
  eventId: string;
  name: string;
  date: Date;
  year: number;
}

export class HolidayServiceCachingProxy {
  private calendarClient: HolidayClient;

  constructor(calendarClient?: HolidayClient) {
    this.calendarClient = calendarClient || getHolidayClient();
  }

  private async isCacheStale(countryCode: string, year: number): Promise<boolean> {
    const staleDate = dayjs().subtract(HOLIDAY_CACHE_DAYS, "days").toDate();

    const cachedEntry = await HolidayRepository.findFirstCacheEntry({ countryCode, year });

    if (!cachedEntry) {
      return true;
    }

    return cachedEntry.updatedAt < staleDate;
  }

  private async refreshCache(countryCode: string, year: number): Promise<void> {
    const calendarConfig = HOLIDAY_COUNTRIES[countryCode];
    if (!calendarConfig) {
      return;
    }

    const holidays = await this.calendarClient.fetchHolidays(countryCode, year);
    await HolidayRepository.refreshCache({ countryCode, year,
      holidays: holidays.map((h: CalendarHoliday) => ({ countryCode: h.countryCode, calendarId: calendarConfig.calendarId, eventId: h.eventId, name: h.name, date: h.date, year: h.year })),
    });
  }

  async getHolidaysForCountry(countryCode: string, year: number): Promise<CachedHoliday[]> {
    const isStale = await this.isCacheStale(countryCode, year);

    if (isStale) {
      await this.refreshCache(countryCode, year);
    }

    const cached = await HolidayRepository.findManyCachedHolidays({ countryCode, year });

    return cached.map(
      (h): CachedHoliday => ({
        id: h.id,
        countryCode: h.countryCode,
        eventId: h.eventId,
        name: h.name,
        date: h.date,
        year: h.year,
      })
    );
  }

  async getHolidaysInRange(countryCode: string, startDate: Date, endDate: Date): Promise<CachedHoliday[]> {
    const startYear = dayjs(startDate).year();
    const endYear = dayjs(endDate).year();

    for (let year = startYear; year <= endYear; year++) {
      const isStale = await this.isCacheStale(countryCode, year);
      if (isStale) {
        await this.refreshCache(countryCode, year);
      }
    }

    const cached = await HolidayRepository.findCachedHolidaysInRange({
      countryCode,
      startDate,
      endDate,
    });

    return cached.map(
      (h): CachedHoliday => ({
        id: h.id,
        countryCode: h.countryCode,
        eventId: h.eventId,
        name: h.name,
        date: h.date,
        year: h.year,
      })
    );
  }
}

let defaultProxy: HolidayServiceCachingProxy | null = null;

export function getHolidayServiceCachingProxy(): HolidayServiceCachingProxy {
  if (!defaultProxy) {
    defaultProxy = new HolidayServiceCachingProxy();
  }
  return defaultProxy;
}
