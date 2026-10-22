import type { z } from "zod";
import type { eventTypeLocations } from "@scheduling/prisma/zod-utils";
export async function getDefaultLocations(_user: unknown): Promise<z.infer<typeof eventTypeLocations>> {
  return [];
}
