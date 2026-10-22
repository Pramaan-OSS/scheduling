import { createContainer } from "@scheduling/features/di/di";
import type { BookingAuditTaskConsumer } from "@scheduling/features/booking-audit/lib/service/BookingAuditTaskConsumer";

import { moduleLoader as bookingAuditTaskConsumerModule } from "./BookingAuditTaskConsumer.module";

const container = createContainer();

export function getBookingAuditTaskConsumer() {
  bookingAuditTaskConsumerModule.loadModule(container);

  return container.get<BookingAuditTaskConsumer>(bookingAuditTaskConsumerModule.token);
}
