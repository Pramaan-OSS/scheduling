import { createModule } from "@evyweb/ioctopus";

import { bindModuleToClassOnToken, type ModuleLoader } from "@scheduling/features/di/di";
import { WorkerLogger } from "@scheduling/lib/workerLogger";

import { SHARED_TOKENS } from "../shared.tokens";

const thisModule = createModule();
const token = SHARED_TOKENS.OWNED_WORKER_LOGGER;
const moduleToken = SHARED_TOKENS.OWNED_WORKER_LOGGER_MODULE;

class WorkerLoggerService extends WorkerLogger {
  constructor() {
    super();
  }
}

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WorkerLoggerService,
  depsMap: {},
});

export const moduleLoader = {
  token: SHARED_TOKENS.OWNED_WORKER_LOGGER,
  loadModule,
} satisfies ModuleLoader;
