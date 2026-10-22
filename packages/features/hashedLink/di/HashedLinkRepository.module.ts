import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@scheduling/features/di/di";
import { DI_TOKENS } from "@scheduling/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@scheduling/features/di/modules/Prisma";

import { HashedLinkRepository } from "../lib/repository/HashedLinkRepository";

const thisModule = createModule();
const token = DI_TOKENS.HASHED_LINK_REPOSITORY;
const moduleToken = DI_TOKENS.HASHED_LINK_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: HashedLinkRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { HashedLinkRepository };
