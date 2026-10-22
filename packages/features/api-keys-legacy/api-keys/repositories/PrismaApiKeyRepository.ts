import { apiKeyPrefix as getApiKeyPrefix } from "@scheduling/features/api-keys-legacy/api-keys/lib/apiKeys";
import { v4 as uuidv4 } from "uuid";

import type { PrismaClient } from "@scheduling/prisma";

import { generateUniqueAPIKey as generateHashedApiKey } from "../lib/apiKeys";

export class PrismaApiKeyRepository {
  constructor(private prismaClient: PrismaClient) {}

  static async withGlobalPrisma() {
    return new PrismaApiKeyRepository((await import("@scheduling/prisma")).prisma);
  }

  async findByHashedKey(hashedKey: string) {
    return this.prismaClient.apiKey.findUnique({
      where: { hashedKey },
      select: {
        id: true,
        hashedKey: true,
        userId: true,
        expiresAt: true,
        user: {
          select: {
            uuid: true,
            role: true,
            locked: true,
            email: true,
          },
        },
      },
    });
  }

  async findApiKeysFromUserId({ userId }: { userId: number }) {
    const apiKeys = await this.prismaClient.apiKey.findMany({
      where: {
        userId,
        appId: null,
      },
      orderBy: { createdAt: "desc" },
    });
    return apiKeys.filter((apiKey) => {
      if (apiKey.note?.startsWith("Cal.ai Phone API Key")) {
        return false;
      }
      return true;
    });
  }

  async createApiKey({
    userId,
    teamId,
    note,
    expiresAt,
  }: {
    userId: number;
    teamId?: number;
    note?: string;
    expiresAt?: Date | null;
  }) {
    const [hashedApiKey, apiKey] = generateHashedApiKey();
    await this.prismaClient.apiKey.create({
      data: {
        id: uuidv4(),
        userId,
        teamId,
        expiresAt,
        hashedKey: hashedApiKey,
        note: note,
      },
    });

    const apiKeyPrefix = getApiKeyPrefix();

    const prefixedApiKey = `${apiKeyPrefix}${apiKey}`;

    return prefixedApiKey;
  }
}
