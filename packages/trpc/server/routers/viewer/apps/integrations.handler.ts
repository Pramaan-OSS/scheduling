import { getConnectedApps } from "@scheduling/app-store/_utils/getConnectedApps";
import { prisma } from "@scheduling/prisma";
import type { TrpcSessionUser } from "@scheduling/trpc/server/types";

import type { TIntegrationsInputSchema } from "./integrations.schema";

type IntegrationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TIntegrationsInputSchema;
};

export const integrationsHandler = async ({ ctx, input }: IntegrationsOptions) => {
  const user = ctx.user;
  return getConnectedApps({ user, input, prisma });
};
