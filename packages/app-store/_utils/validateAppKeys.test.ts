import { expect, test } from "vitest";
import { shouldEnableApp } from "./validateAppKeys";
test("cannot enable an app outside the closed catalogue", () => { expect(shouldEnableApp("retired-app", {})).toBe(false); expect(shouldEnableApp("pramaan-payment", {})).toBe(true); expect(shouldEnableApp("pramaan-payment", { api_key: "fixture" })).toBe(false); });
