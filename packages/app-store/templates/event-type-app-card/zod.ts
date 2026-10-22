import { z } from "zod";

import { eventTypeAppCardZod } from "@scheduling/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    isSunrise: z.boolean(),
  })
);
export const appKeysSchema = z.object({});
