import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@scheduling/features/di/di";
import { moduleLoader as loggerServiceModule } from "@scheduling/features/di/shared/services/logger.service";
import { WebhookTriggerTasker } from "@scheduling/features/webhooks/lib/tasker/WebhookTriggerTasker";

import { WEBHOOK_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = WEBHOOK_TASKER_DI_TOKENS.WEBHOOK_TRIGGER_TASKER;
const moduleToken = WEBHOOK_TASKER_DI_TOKENS.WEBHOOK_TRIGGER_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WebhookTriggerTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
