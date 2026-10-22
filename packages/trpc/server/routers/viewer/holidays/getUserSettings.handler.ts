import { getHolidayService } from "@scheduling/lib/holidays";
import type { TrpcSessionUser } from "@scheduling/trpc/server/types";

import type { TGetUserSettingsSchema } from "./getUserSettings.schema";

type GetUserSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetUserSettingsSchema;
};

export async function getUserSettingsHandler({ ctx }: GetUserSettingsOptions) {
  const holidayService = getHolidayService();
  return holidayService.getUserSettings(ctx.user.id);
}

export default getUserSettingsHandler;
