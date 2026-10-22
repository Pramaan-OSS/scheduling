import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@scheduling/features/di/di";
import { DI_TOKENS } from "@scheduling/features/di/tokens";
import { ProfileRepository } from "@scheduling/features/profile/repositories/ProfileRepository";
import { moduleLoader as prismaModuleLoader } from "@scheduling/features/di/modules/Prisma";

export const profileRepositoryModule = createModule();
const token = DI_TOKENS.PROFILE_REPOSITORY;
const moduleToken = DI_TOKENS.PROFILE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: profileRepositoryModule,
  moduleToken,
  token,
  classs: ProfileRepository,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
