import { FilterSegmentRepository } from "@scheduling/features/data-table/repositories/filterSegment";
import type { TUpdateFilterSegmentInputSchema } from "@scheduling/features/data-table/repositories/filterSegment.type";
import type { TrpcSessionUser } from "@scheduling/trpc/server/types";

export const updateFilterSegmentHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateFilterSegmentInputSchema;
}) => {
  const repository = new FilterSegmentRepository();
  return await repository.update({
    userId: ctx.user.id,
    input,
  });
};
