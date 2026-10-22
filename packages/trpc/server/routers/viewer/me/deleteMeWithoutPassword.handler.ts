import { ErrorCode } from "@scheduling/features/auth/lib/ErrorCode";
import { prisma } from "@scheduling/prisma";
import { IdentityProvider } from "@scheduling/prisma/enums";
import type { TrpcSessionUser } from "@scheduling/trpc/server/types";

type DeleteMeWithoutPasswordOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const deleteMeWithoutPasswordHandler = async ({ ctx }: DeleteMeWithoutPasswordOptions) => {
  const user = await prisma.user.findUnique({
    where: {
      email: ctx.user.email.toLowerCase(),
    },
  });
  if (!user) {
    throw new Error(ErrorCode.UserNotFound);
  }

  if (user.identityProvider === IdentityProvider.CAL) {
    throw new Error(ErrorCode.SocialIdentityProviderRequired);
  }

  if (user.twoFactorEnabled) {
    throw new Error(ErrorCode.SocialIdentityProviderRequired);
  }

  // Remove me from LegacyPayment

  // Remove my account
  await prisma.user.delete({
    where: {
      id: ctx.user.id,
    },
  });

  return;
};
