import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@scheduling/features/di/di";
import { moduleLoader as loggerServiceModule } from "@scheduling/features/di/shared/services/logger.service";
import { CalendarsSyncTasker } from "@scheduling/features/calendars/lib/tasker/CalendarsSyncTasker";

import { moduleLoader as calendarsTaskServiceModuleLoader } from "./CalendarsTaskService.module";
import { CALENDARS_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDARS_TASKER_DI_TOKENS.CALENDARS_SYNC_TASKER;
const moduleToken = CALENDARS_TASKER_DI_TOKENS.CALENDARS_SYNC_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarsSyncTasker,
  depsMap: {
    logger: loggerServiceModule,
    calendarsTaskService: calendarsTaskServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
