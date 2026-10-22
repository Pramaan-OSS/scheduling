import { createModule } from "@evyweb/ioctopus";
import type { Container } from "@evyweb/ioctopus";

import tasker from "@scheduling/features/tasker";
import type { ITasker } from "@scheduling/features/webhooks/lib/interface/infrastructure";

import { SHARED_TOKENS } from "../shared.tokens";

export const taskerServiceModule = createModule();
const token = SHARED_TOKENS.TASKER;

taskerServiceModule.bind(SHARED_TOKENS.TASKER).toFactory((): ITasker => {
  return tasker;
});

const loadModule = (container: Container) => {
  container.load(SHARED_TOKENS.TASKER, taskerServiceModule);
};

export const moduleLoader = {
  token,
  loadModule,
};
