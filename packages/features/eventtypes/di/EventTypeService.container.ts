import { createContainer } from "@scheduling/features/di/di";
import { prismaModule } from "@scheduling/features/di/modules/Prisma";
import { DI_TOKENS } from "@scheduling/features/di/tokens";
import {
  type EventTypeBrandingData,
  type EventTypeService,
  moduleLoader as eventTypeServiceModule,
} from "./EventTypeService.module";

const eventTypeServiceContainer = createContainer();
eventTypeServiceContainer.load(DI_TOKENS.PRISMA_MODULE, prismaModule);

export type { EventTypeBrandingData };

export function getEventTypeService(): EventTypeService {
  eventTypeServiceModule.loadModule(eventTypeServiceContainer);
  return eventTypeServiceContainer.get<EventTypeService>(eventTypeServiceModule.token);
}
