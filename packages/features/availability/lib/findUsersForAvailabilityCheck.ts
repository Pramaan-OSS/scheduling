import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@scheduling/app-store/delegationCredential";
import { withSelectedCalendars } from "@scheduling/lib/server/withSelectedCalendars";
import { availabilityUserSelect } from "@scheduling/prisma";
import { prisma } from "@scheduling/prisma";
import type { Prisma } from "@scheduling/prisma/client";
import { credentialForCalendarServiceSelect } from "@scheduling/prisma/selects/credential";

export async function findUsersForAvailabilityCheck({ where }: { where: Prisma.UserWhereInput }) {
  const user = await prisma.user.findFirst({
    where,
    select: {
      ...availabilityUserSelect,
      selectedCalendars: true,
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
    },
  });

  if (!user) {
    return null;
  }

  return await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: withSelectedCalendars(user),
  });
}
