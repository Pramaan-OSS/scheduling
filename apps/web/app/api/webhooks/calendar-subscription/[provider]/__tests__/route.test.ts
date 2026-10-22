import { expect, test } from "vitest";
import { POST } from "../route";
test("retired subscriptions do not accept callbacks or imply a calendar was checked", async () => { const response = await POST(); expect(response.status).toBe(422); expect((await response.json()).message).toContain("not available yet"); });
