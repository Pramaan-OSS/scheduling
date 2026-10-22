import { hashAPIKey, unprefixAPIKey } from "@scheduling/features/api-keys-legacy/api-keys/lib/apiKeys";
import prisma from "@scheduling/prisma";

const findValidApiKey = async (apiKey: string, appId?: string) => {
  const hashedKey = hashAPIKey(unprefixAPIKey(apiKey));

  const validKey = await prisma.apiKey.findFirst({
    where: {
      hashedKey,
      appId,
      OR: [
        {
          expiresAt: {
            gte: new Date(Date.now()),
          },
        },
        {
          expiresAt: null,
        },
      ],
    },
  });
  return validKey;
};

export default findValidApiKey;
