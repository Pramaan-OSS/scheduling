import { prisma } from "@scheduling/prisma";
import { userMetadata } from "@scheduling/prisma/zod-utils";
import type { TrpcSessionUser } from "@scheduling/trpc/server/types";
import { TRPCError } from "@trpc/server";

type LegacyPaymentCustomerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const legacyPaymentCustomerHandler = async ({ ctx }: LegacyPaymentCustomerOptions) => {
  const {
    user: { id: userId },
  } = ctx;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      metadata: true,
    },
  });

  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User not found" });
  }

  const metadata = userMetadata.parse(user.metadata);

  return {
    isPremium: !!metadata?.isPremium,
    username: null,
  };
};
