import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { weatherCalendar } from "../../lib/integrations/weather";
test("weather lookup creates an app-owned calendar snapshot", async () => {
  const fake = new FakePramaan({ [Cap.weatherForecastGet]: () => ({ forecast7day: [{ date: "2026-10-15", highC: 20, lowC: 10, condition: "Clear" }] }) });
  const calendar = await weatherCalendar("Fixture city", fake);
  expect(fake.calls[0]!.input).toEqual({ city: "Fixture city" });
  expect(calendar).toContain("BEGIN:VCALENDAR");
  expect(calendar).toContain("High 20");
  expect(calendar.replace(/\r\n[ \t]/g, "")).toContain("refresh manually");
});
test("forecast errors do not produce a blank or fake calendar", async () => {
  const fake = new FakePramaan({ [Cap.weatherForecastGet]: () => { throw new PramaanError("upstream_unavailable", "hidden"); } });
  await expect(weatherCalendar("Fixture city", fake)).rejects.toThrow("not available yet");
  expect(fake.calls).toHaveLength(1);
});
