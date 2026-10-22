import { expect, test } from "vitest";
import { getDefaultLocations } from "./getDefaultLocations";
test("does not silently create or select a meeting room", async () => { expect(await getDefaultLocations({})).toEqual([]); });
