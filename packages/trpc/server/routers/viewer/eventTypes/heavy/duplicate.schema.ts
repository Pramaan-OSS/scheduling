import type { z } from "zod";

import { EventTypeDuplicateInput } from "@scheduling/features/eventtypes/lib/schemas";

export const ZDuplicateInputSchema = EventTypeDuplicateInput;

export type TDuplicateInputSchema = z.infer<typeof ZDuplicateInputSchema>;
