import {
  getCalendarCredentials,
  getConnectedCalendars,
} from "@scheduling/features/calendars/lib/CalendarManager";
import { buildNonDelegationCredentials } from "@scheduling/lib/delegationCredential";
import { prisma } from "@scheduling/prisma";
import { credentialForCalendarServiceSelect } from "@scheduling/prisma/selects/credential";
import type { TrpcSessionUser } from "@scheduling/trpc/server/types";
import { checkInvalidAppCredentials } from "./checkForInvalidAppCredentials";
import { shouldVerifyEmailHandler } from "./shouldVerifyEmail.handler";

const getUpgradeableHandler = async (..._args: unknown[]) => null;
const checkIfOrgNeedsUpgradeHandler = async (..._args: unknown[]) => false;

type Props = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getUserTopBannersHandler = async ({ ctx }: Props) => {
  const upgradeableTeamMememberships = getUpgradeableHandler({ userId: ctx.user.id });
  const upgradeableOrgMememberships = checkIfOrgNeedsUpgradeHandler({ ctx });
  const shouldEmailVerify = shouldVerifyEmailHandler({ ctx });
  const appsWithInavlidCredentials = checkInvalidAppCredentials({ ctx });

  const [
    teamUpgradeBanner,
    orgUpgradeBanner,
    verifyEmailBanner,
    invalidAppCredentialBanners,
  ] = await Promise.allSettled([
    upgradeableTeamMememberships,
    upgradeableOrgMememberships,
    shouldEmailVerify,
    appsWithInavlidCredentials,
  ]);

  return {
    teamUpgradeBanner: teamUpgradeBanner.status === "fulfilled" ? teamUpgradeBanner.value : [],
    orgUpgradeBanner: orgUpgradeBanner.status === "fulfilled" ? orgUpgradeBanner.value : [],
    verifyEmailBanner: verifyEmailBanner.status === "fulfilled" ? !verifyEmailBanner.value.isVerified : false,
    calendarCredentialBanner: false,
    invalidAppCredentialBanners:
      invalidAppCredentialBanners.status === "fulfilled" ? invalidAppCredentialBanners.value : [],
    dueInvoiceBanner: null,
  };
};
