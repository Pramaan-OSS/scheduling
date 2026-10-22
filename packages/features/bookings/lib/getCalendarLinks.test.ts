import type { TFunction } from "i18next";
import { createEvent } from "ics";
import { RRule } from "rrule";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import dayjs from "@scheduling/dayjs";
import { parseRecurringEvent } from "@scheduling/lib/isRecurringEvent";

import { getCalendarLinks, CalendarLinkType } from "./getCalendarLinks";

// Mock dependencies
vi.mock("ics", () => ({
  createEvent: vi.fn(),
}));

vi.mock("@scheduling/lib/isRecurringEvent", () => ({
  parseRecurringEvent: vi.fn(),
}));

describe("getCalendarLinks", () => {
  // Mock data for tests
  const mockStartTime = new Date("2023-01-15T10:00:00Z");
  const mockEndTime = new Date("2023-01-15T11:00:00Z");
  const mockDayjsStartTime = dayjs(mockStartTime);
  const mockDayjsEndTime = dayjs(mockEndTime);

  // Mock translation function
  const mockT = ((key: string) => key) as TFunction;

  // Mock createEvent implementation
  const mockIcsValue = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR";

  // Baseline mock objects that can be reused across tests
  const baseMockBooking = {
    startTime: mockStartTime,
    endTime: mockEndTime,
    location: "Test Location",
    title: "Test Title",
    responses: {},
    metadata: {},
  };

  const baseMockEventType = {
    recurringEvent: {},
    description: "Test Description",
    eventName: "Test Event",
    isDynamic: false,
    length: 60,
    team: null,
    users: [{ name: "Test User" }],
    title: "Test Title",
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Default mock implementations
    (createEvent as jest.Mock).mockReturnValue({ value: mockIcsValue });
    (parseRecurringEvent as jest.Mock).mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("offers one local calendar download", () => {
    const result = getCalendarLinks({ booking: baseMockBooking, eventType: baseMockEventType, t: mockT });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(CalendarLinkType.ICS);
    expect(decodeURIComponent(result[0].link)).toContain(mockIcsValue);
    expect(result[0].link).not.toMatch(/^https?:/);
  });

  it("uses the appointment time, duration and location", () => {
    getCalendarLinks({ booking: baseMockBooking, eventType: baseMockEventType, t: mockT });
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      start: [2023, 1, 15, 10, 0], duration: { minutes: 60 }, location: "Test Location",
    }));
  });

  it("reports an unavailable export without opening another service", () => {
    vi.mocked(createEvent).mockReturnValue({ error: new Error("Invalid event") });
    const result = getCalendarLinks({ booking: baseMockBooking, eventType: baseMockEventType, t: mockT });
    expect(result).toHaveLength(1);
    expect(result[0].link).toBe("");
  });
});
