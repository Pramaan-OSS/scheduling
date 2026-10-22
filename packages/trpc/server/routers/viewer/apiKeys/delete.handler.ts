import prisma from "@scheduling/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;

  const apiKeyToDelete = await prisma.apiKey.findUnique({
    where: {
      id,
    },
  });

  await prisma.user.update({
    where: {
      id: ctx.user.id,
    },
    data: {
      apiKeys: {
        delete: {
          id,
        },
      },
    },
  });

  return {
    id,
  };
};
