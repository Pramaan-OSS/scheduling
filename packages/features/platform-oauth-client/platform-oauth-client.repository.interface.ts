import type { PlatformOAuthClient } from "@scheduling/prisma/client";

export interface IPlatformOAuthClientRepository {
  getByUserId(userId: number): Promise<PlatformOAuthClient | null>;
}
