import { BookingEmailAndSmsTasker } from "@scheduling/features/bookings/lib/tasker/BookingEmailAndSmsTasker";
import { createContainer } from "@scheduling/features/di/di";

import { moduleLoader as BookingEmailAndSmsTaskServiceModule } from "./BookingEmailAndSmsTaskService.module";

const container = createContainer();

export function getBookingEmailAndSmsTaskService(): BookingEmailAndSmsTasker {
  BookingEmailAndSmsTaskServiceModule.loadModule(container);
  return container.get<BookingEmailAndSmsTasker>(BookingEmailAndSmsTaskServiceModule.token);
}
