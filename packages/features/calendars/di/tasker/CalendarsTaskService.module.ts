import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@scheduling/features/di/di";
import { moduleLoader as loggerServiceModule } from "@scheduling/features/di/shared/services/logger.service";
import { moduleLoader as prismaModuleLoader } from "@scheduling/features/di/modules/Prisma";
import { CalendarsTaskService } from "@scheduling/features/calendars/lib/tasker/CalendarsTaskService";

import { CALENDARS_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDARS_TASKER_DI_TOKENS.CALENDARS_TASK_SERVICE;
const moduleToken = CALENDARS_TASKER_DI_TOKENS.CALENDARS_TASK_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarsTaskService,
  depsMap: {
    logger: loggerServiceModule,
    prisma: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
