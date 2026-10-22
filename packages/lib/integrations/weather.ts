import { createEvents } from "ics";
import { Cap, requirePramaan, unavailableMessage, type Pramaan } from "@scheduling/pramaan";
export async function weatherCalendar(city: string, client?: Pramaan) {
  try {
    const result = await (client || requirePramaan()).call(Cap.weatherForecastGet, { city }) as { forecast7day?: { date?: string; condition?: string; highC?: number; lowC?: number }[] };
    if (!Array.isArray(result.forecast7day) || !result.forecast7day.length) throw new Error("Forecast data could not be confirmed.");
    const events = result.forecast7day.map(row => {
      if (!row.date || !Number.isFinite(Date.parse(row.date))) throw new Error("Forecast dates could not be confirmed.");
      const date = new Date(row.date);
      return { title: `Weather · ${city}`, description: [row.condition, typeof row.highC === "number" ? `High ${row.highC}°C` : "", typeof row.lowC === "number" ? `Low ${row.lowC}°C` : "", "Forecast snapshot; refresh manually."].filter(Boolean).join("\n"), start: [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()] as [number, number, number], duration: { days: 1 }, productId: "scheduling/weather" };
    });
    const calendar = createEvents(events);
    if (!calendar.value || calendar.error) throw new Error("Weather calendar could not be prepared.");
    return calendar.value;
  } catch (error) { throw new Error(unavailableMessage(error)); }
}
