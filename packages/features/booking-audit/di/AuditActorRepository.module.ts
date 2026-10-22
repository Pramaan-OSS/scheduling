import { PrismaAuditActorRepository } from "@scheduling/features/booking-audit/lib/repository/PrismaAuditActorRepository";
import { BOOKING_AUDIT_DI_TOKENS } from "@scheduling/features/booking-audit/di/tokens";
import { bindModuleToClassOnToken } from "@scheduling/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@scheduling/features/di/modules/Prisma";
import { createModule } from "../../di/di";

export const auditActorRepositoryModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.AUDIT_ACTOR_REPOSITORY;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.AUDIT_ACTOR_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: auditActorRepositoryModule,
  moduleToken,
  token,
  classs: PrismaAuditActorRepository,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
