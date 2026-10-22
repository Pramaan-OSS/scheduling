import { getFeaturesRepository } from "@scheduling/features/di/containers/FeaturesRepository";
import type { AppFlags } from "@scheduling/features/flags/config";
import publicProcedure from "@scheduling/trpc/server/procedures/publicProcedure";
import { router } from "@scheduling/trpc/server/trpc";
import { z } from "zod";
import { map } from "./map";

export const featureFlagRouter = router({
  list: publicProcedure.query(async () => {
    const featuresRepository = getFeaturesRepository();
    return featuresRepository.getAllFeatures();
  }),
  checkTeamFeature: publicProcedure
    .input(
      z.object({
        teamId: z.number(),
        feature: z.string(),
      })
    )
    .query(async ({ input }) => {
      const featuresRepository = getFeaturesRepository();
      return featuresRepository.checkIfTeamHasFeature(input.teamId, input.feature as keyof AppFlags);
    }),
  map,
});
