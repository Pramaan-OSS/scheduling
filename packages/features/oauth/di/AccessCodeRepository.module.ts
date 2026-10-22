import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@scheduling/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@scheduling/features/di/modules/Prisma";
import { AccessCodeRepository } from "@scheduling/features/oauth/repositories/AccessCodeRepository";

import { OAUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = OAUTH_DI_TOKENS.ACCESS_CODE_REPOSITORY;
const moduleToken = OAUTH_DI_TOKENS.ACCESS_CODE_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AccessCodeRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AccessCodeRepository };
