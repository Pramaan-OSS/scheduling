import { expect, test } from "vitest";
import { createCRMEvent } from "../createCRMEvent";
test("automatic contact sync requires an explicit review rather than a worker retry", async () => { await expect(createCRMEvent(JSON.stringify({ bookingId: 1 }))).rejects.toThrow("Review a contact action"); });
