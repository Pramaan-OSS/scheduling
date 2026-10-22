import prismaMock from "@scheduling/testing/lib/__mocks__/prisma";
import { createBookingScenario, getBooker, getOrganizer, getScenarioData, TestData } from "@scheduling/testing/lib/bookingScenario/bookingScenario";
import { getMockRequestDataForBooking } from "@scheduling/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@scheduling/testing/lib/bookingScenario/setupAndTeardown";
import { describe, expect, test } from "vitest";
import { getNewBookingHandler } from "./getNewBookingHandler";

describe("Bookings without a meeting app", () => {
  setupAndTeardown();
  test("returns the saved booking when neither a location nor a default meeting app is configured", async () => {
    const organizer = getOrganizer({ id: 101, name: "Host", email: "host@example.test", schedules: [TestData.schedules.IstWorkHours], credentials: [], selectedCalendars: [], metadata: {} });
    await createBookingScenario(getScenarioData({ users: [organizer], eventTypes: [{ id: 1, length: 30, locations: [], users: [{ id: 101 }] }] }));
    const booker = getBooker({ name: "Guest", email: "guest@example.test" });
    const bookingData = getMockRequestDataForBooking({ data: { eventTypeId: 1, responses: { name: booker.name, email: booker.email } } });
    const result = await getNewBookingHandler()({ bookingData });
    expect(result.uid).toBeTruthy();
    const saved = await prismaMock.booking.findUnique({ where: { uid: result.uid } });
    expect(saved?.status).toBe("ACCEPTED");
    expect(saved?.location || "").not.toMatch(/^integrations:/);
  }, 20000);
});
