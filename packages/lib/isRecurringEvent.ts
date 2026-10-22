import { recurringEventType as recurringEventSchema } from "@scheduling/prisma/zod-utils";
import type { RecurringEvent } from "@scheduling/types/Calendar";

export function isRecurringEvent(obj: unknown): obj is RecurringEvent {
  const parsed = recurringEventSchema.safeParse(obj);

  return parsed.success;
}

export function parseRecurringEvent(obj: unknown): RecurringEvent | null {
  let recurringEvent: RecurringEvent | null = null;

  if (isRecurringEvent(obj)) recurringEvent = obj;

  return recurringEvent;
}
