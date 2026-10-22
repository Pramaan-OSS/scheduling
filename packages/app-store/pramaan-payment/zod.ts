import { z } from "zod";
import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
export const paymentOptionEnum = z.enum(["ON_BOOKING", "HOLD"]);
export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number().int().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    enabled: z.boolean().optional(),
    paymentOption: z.literal("ON_BOOKING").optional(),
    credentialId: z.number().optional(),
    refundPolicy: z.string().optional(),
    refundDaysCount: z.number().optional(),
    refundCountCalendarDays: z.boolean().optional(),
  })
);

export const appKeysSchema = z.object({}).strict();
