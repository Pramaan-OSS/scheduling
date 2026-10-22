import { captureException } from "@scheduling/lib/observability";

import { appStoreMetadata } from "@scheduling/app-store/appStoreMetaData";
import { shouldEnableApp } from "@scheduling/app-store/_utils/validateAppKeys";
import { prisma } from "@scheduling/prisma";
import type { Prisma } from "@scheduling/prisma/client";

export class PrismaAppRepository {
  static async seedApp(dirName: string, keys?: Prisma.InputJsonValue) {
    const appMetadata = appStoreMetadata[dirName as keyof typeof appStoreMetadata];

    if (!appMetadata) {
      throw new Error(`App ${dirName} not found`);
    }

    // Only enable if keys are valid (or app doesn't require keys)
    const enabled = shouldEnableApp(dirName, keys as Prisma.JsonValue);
    await prisma.app.create({
      data: {
        slug: appMetadata.slug,
        categories: appMetadata.categories,
        dirName: dirName,
        keys,
        enabled,
      },
    });
  }

  static async findAppStore() {
    try {
      return await prisma.app.findMany({ select: { slug: true } });
    } catch (error) {
      captureException(error);
      throw error;
    }
  }
}
