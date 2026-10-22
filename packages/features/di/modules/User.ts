import { DI_TOKENS } from "@scheduling/features/di/tokens";
import { UserRepository } from "@scheduling/features/users/repositories/UserRepository";
import { moduleLoader as prismaModuleLoader } from "@scheduling/features/di/modules/Prisma";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const userRepositoryModule = createModule();
const token = DI_TOKENS.USER_REPOSITORY;
const moduleToken = DI_TOKENS.USER_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: userRepositoryModule,
  moduleToken,
  token,
  classs: UserRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
