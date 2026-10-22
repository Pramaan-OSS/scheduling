import type { z } from "zod";

import { createEventTypeInput } from "@scheduling/features/eventtypes/lib/schemas";

export const ZCreateInputSchema = createEventTypeInput;

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
