import { expect, test } from "vitest";
import { GET } from "../route";
test("does not redirect to a retired recording service", async () => { const response = await GET(); expect(response.status).toBe(422); expect(await response.json()).toEqual({ message: "Recordings are not available yet." }); });
