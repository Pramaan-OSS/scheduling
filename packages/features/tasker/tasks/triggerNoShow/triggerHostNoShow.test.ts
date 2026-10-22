import { expect, test } from "vitest";
import { triggerHostNoShow } from "./triggerHostNoShow";
test("automatic attendance checks stop before changing a booking", async () => {
 await expect(triggerHostNoShow("{}" )).rejects.toThrow("not available yet");
});
