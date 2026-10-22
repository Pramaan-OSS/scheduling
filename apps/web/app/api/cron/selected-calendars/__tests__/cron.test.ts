import { expect, test } from "vitest";
import { GET } from "../route";
test("does not silently provision delegated calendars", async () => { const response = await GET(); expect(response.status).toBe(422); expect((await response.json()).message.toLowerCase()).toContain("primary calendar"); });
