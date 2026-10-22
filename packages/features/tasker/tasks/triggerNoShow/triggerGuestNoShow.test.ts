import { expect, test } from "vitest";
import { triggerGuestNoShow } from "./triggerGuestNoShow";
test("automatic attendance checks stop before changing a booking", async () => {
 await expect(triggerGuestNoShow("{}" )).rejects.toThrow("not available yet");
});
