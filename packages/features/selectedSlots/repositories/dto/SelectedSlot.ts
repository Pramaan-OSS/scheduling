import type { SelectedSlots } from "@scheduling/prisma/client";

export type SelectedSlot = Pick<
  SelectedSlots,
  "id" | "uid" | "eventTypeId" | "slotUtcStartDate" | "slotUtcEndDate" | "releaseAt" | "isSeat"
>;
