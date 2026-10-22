import { BookingEmailAndSmsWorkerTasker } from "@scheduling/features/bookings/lib/tasker/BookingEmailAndSmsTriggerTasker";
import { createContainer } from "@scheduling/features/di/di";

import { moduleLoader as BookingEmailAndSmsWorkerTaskerModule } from "./BookingEmailAndSmsWorkerTasker.module";

const container = createContainer();

export function getBookingEmailAndSmsWorkerTasker(): BookingEmailAndSmsWorkerTasker {
  BookingEmailAndSmsWorkerTaskerModule.loadModule(container);
  return container.get<BookingEmailAndSmsWorkerTasker>(BookingEmailAndSmsWorkerTaskerModule.token);
}
