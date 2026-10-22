import { expect, test } from "vitest";
import { DefaultAdapterFactory } from "./AdaptersFactory";
test("subscription discovery is switched off without implying a calendar is checked", () => { const factory = new DefaultAdapterFactory(); expect(factory.getProviders()).toEqual([]); expect(() => factory.get("primary_calendar")).toThrow("not available yet"); });
