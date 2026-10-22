import { DI_TOKENS } from "@scheduling/features/di/tokens";
import { CredentialRepository } from "@scheduling/features/credentials/repositories/CredentialRepository";
import { moduleLoader as prismaModuleLoader } from "@scheduling/features/di/modules/Prisma";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "@scheduling/features/di/di";

export const credentialRepositoryModule = createModule();
const token = DI_TOKENS.CREDENTIAL_REPOSITORY;
const moduleToken = DI_TOKENS.CREDENTIAL_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: credentialRepositoryModule,
  moduleToken,
  token,
  classs: CredentialRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
