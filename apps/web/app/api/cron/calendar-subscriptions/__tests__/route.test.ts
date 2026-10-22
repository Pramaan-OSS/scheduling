import { expect, test } from "vitest";
import { GET } from "../route";
test("does not claim to renew retired subscriptions", async () => { const response = await GET(); expect(response.status).toBe(422); expect((await response.json()).message).toContain("not available yet"); });
