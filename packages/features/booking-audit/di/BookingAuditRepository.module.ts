import { PrismaBookingAuditRepository } from "@scheduling/features/booking-audit/lib/repository/PrismaBookingAuditRepository";
import { BOOKING_AUDIT_DI_TOKENS } from "@scheduling/features/booking-audit/di/tokens";
import { bindModuleToClassOnToken } from "@scheduling/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@scheduling/features/di/modules/Prisma";
import { createModule } from "../../di/di";

export const bookingAuditRepositoryModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_REPOSITORY;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: bookingAuditRepositoryModule,
  moduleToken,
  token,
  classs: PrismaBookingAuditRepository,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
