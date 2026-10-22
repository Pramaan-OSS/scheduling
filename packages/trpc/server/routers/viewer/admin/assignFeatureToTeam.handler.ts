import type { FeatureId } from "@scheduling/features/flags/config";
import { FeaturesRepository } from "@scheduling/features/flags/features.repository";
import type { PrismaClient } from "@scheduling/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminAssignFeatureToTeamSchema } from "./assignFeatureToTeam.schema";

type AssignFeatureOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TAdminAssignFeatureToTeamSchema;
};

export const assignFeatureToTeamHandler = async ({ ctx, input }: AssignFeatureOptions) => {
  const { prisma, user } = ctx;
  const { teamId, featureId } = input;

  const featuresRepository = new FeaturesRepository(prisma);
  await featuresRepository.setTeamFeatureState({
    teamId,
    featureId: featureId as FeatureId,
    state: "enabled",
    assignedBy: `user:${user.id}`,
  });

  return { success: true };
};

export default assignFeatureToTeamHandler;
