import { BookingEventHandlerService } from "@scheduling/features/bookings/lib/onBookingEvents/BookingEventHandlerService";
import { bindModuleToClassOnToken, createModule } from "@scheduling/features/di/di";
import { moduleLoader as loggerModuleLoader } from "@scheduling/features/di/shared/services/logger.service";
import { DI_TOKENS } from "@scheduling/features/di/tokens";
import { moduleLoader as hashedLinkServiceModuleLoader } from "@scheduling/features/hashedLink/di/HashedLinkService.module";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_EVENT_HANDLER_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_EVENT_HANDLER_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingEventHandlerService,
  depsMap: {
    hashedLinkService: hashedLinkServiceModuleLoader,
    log: loggerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { BookingEventHandlerService };
