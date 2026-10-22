import { TravelScheduleRepository } from "@scheduling/features/travelSchedule/repositories/TravelScheduleRepository";
import type { TrpcSessionUser } from "@scheduling/trpc/server/types";

type GetTravelSchedulesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getTravelSchedulesHandler = async ({ ctx }: GetTravelSchedulesOptions) => {
  return await TravelScheduleRepository.findTravelSchedulesByUserId(ctx.user.id);
};
