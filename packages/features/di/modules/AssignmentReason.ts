import { AssignmentReasonRepository } from "@scheduling/features/assignment-reason/repositories/AssignmentReasonRepository";
import { DI_TOKENS } from "@scheduling/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@scheduling/features/di/modules/Prisma";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const assignmentReasonRepositoryModule = createModule();
const token = DI_TOKENS.ASSIGNMENT_REASON_REPOSITORY;
const moduleToken = DI_TOKENS.ASSIGNMENT_REASON_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: assignmentReasonRepositoryModule,
  moduleToken,
  token,
  classs: AssignmentReasonRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
