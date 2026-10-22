import { DI_TOKENS } from "@scheduling/features/di/tokens";
import { redisModule } from "@scheduling/features/redis/di/redisModule";
import { membershipRepositoryModule } from "@scheduling/features/users/di/MembershipRepository.module";
import { prismaModule } from "@scheduling/features/di/modules/Prisma";
import type { NoSlotsNotificationService } from "@scheduling/features/slots/handleNotificationWhenNoSlots";

import { createContainer } from "../di";
import { noSlotsNotificationModule } from "../modules/NoSlotsNotification";

const container = createContainer();
container.load(DI_TOKENS.REDIS_CLIENT, redisModule);
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.MEMBERSHIP_REPOSITORY_MODULE, membershipRepositoryModule);
container.load(DI_TOKENS.NO_SLOTS_NOTIFICATION_SERVICE_MODULE, noSlotsNotificationModule);

export function getNoSlotsNotificationService() {
  return container.get<NoSlotsNotificationService>(DI_TOKENS.NO_SLOTS_NOTIFICATION_SERVICE);
}
