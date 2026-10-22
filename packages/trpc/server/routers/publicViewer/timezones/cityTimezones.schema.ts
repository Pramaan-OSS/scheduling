import { z } from "zod";

export const cityTimezonesSchema = z.object({
  SchedulingVersion: z.string(),
});

export type CityTimezonesSchema = z.infer<typeof cityTimezonesSchema>;
