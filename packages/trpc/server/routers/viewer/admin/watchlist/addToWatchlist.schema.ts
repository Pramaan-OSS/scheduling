import { z } from "zod";

import { WatchlistType } from "@scheduling/prisma/enums";

export const ZAddToWatchlistInputSchema = z.object({
  email: z.string().email(),
  type: z.nativeEnum(WatchlistType),
  description: z.string().optional(),
});

export type TAddToWatchlistInputSchema = z.infer<typeof ZAddToWatchlistInputSchema>;
