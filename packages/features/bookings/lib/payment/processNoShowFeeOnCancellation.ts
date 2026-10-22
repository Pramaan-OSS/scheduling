import { eventTypeMetaDataSchemaWithTypedApps } from "@scheduling/app-store/zod-utils";
import { MembershipRepository } from "@scheduling/features/membership/repositories/MembershipRepository";
import logger from "@scheduling/lib/logger";
import type { Payment } from "@scheduling/prisma/client";
import { MembershipRole } from "@scheduling/prisma/enums";

import { handleNoShowFee } from "./handleNoShowFee";
import { shouldChargeNoShowCancellationFee } from "./shouldChargeNoShowCancellationFee";

export const processNoShowFeeOnCancellation = async ({
  booking,
  payments,
  cancelledByUserId,
}: {
  booking: Parameters<typeof handleNoShowFee>[0]["booking"];
  payments: Payment[];
  cancelledByUserId?: number;
}) => {
  if (payments.some(payment => payment.paymentOption === "HOLD" && !payment.success)) {
    throw new Error("Card holds and no-show charges are not available yet.");
  }
};
