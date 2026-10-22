import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { HolidayClient } from "../../lib/holidays/HolidayClient";
test("public holiday lookup uses country/year and stable local identities", async () => {
  const fake = new FakePramaan({ [Cap.timeHolidaysList]: () => ({ totalHolidays: 1, holidays: [{ name: "Holiday", date: "2026-01-01" }] }) });
  const client = new HolidayClient(fake);
  const rows = await client.fetchHolidays("US", 2026);
  expect(fake.calls[0]!.input).toEqual({ countryCode: "US", year: 2026 });
  expect(rows[0]!.date.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  expect((await client.fetchHolidays("US", 2026))[0]!.eventId).toBe(rows[0]!.eventId);
});
test("unavailable or incomplete holiday data cannot become an empty calendar", async () => {
  for (const route of [() => ({}), () => { throw new PramaanError("upstream_unavailable", "hidden"); }]) {
    const fake = new FakePramaan({ [Cap.timeHolidaysList]: route });
    await expect(new HolidayClient(fake).fetchHolidays("US", 2026)).rejects.toThrow();
  }
});
