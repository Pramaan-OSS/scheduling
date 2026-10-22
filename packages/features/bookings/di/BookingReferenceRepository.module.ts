import { bindModuleToClassOnToken, createModule } from "@scheduling/features/di/di";
import { DI_TOKENS } from "@scheduling/features/di/tokens";
import { BookingReferenceRepository } from "@scheduling/features/bookingReference/repositories/BookingReferenceRepository";
import { moduleLoader as prismaModuleLoader } from "@scheduling/features/di/modules/Prisma";

export const bookingReferenceRepositoryModule = createModule();
const token = DI_TOKENS.BOOKING_REFERENCE_REPOSITORY;
const moduleToken = DI_TOKENS.BOOKING_REFERENCE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: bookingReferenceRepositoryModule,
  moduleToken,
  token,
  classs: BookingReferenceRepository,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
