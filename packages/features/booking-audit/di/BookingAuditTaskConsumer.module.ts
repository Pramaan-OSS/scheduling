import { BookingAuditTaskConsumer } from "@scheduling/features/booking-audit/lib/service/BookingAuditTaskConsumer";
import { BOOKING_AUDIT_DI_TOKENS } from "@scheduling/features/booking-audit/di/tokens";
import { moduleLoader as bookingAuditRepositoryModuleLoader } from "@scheduling/features/booking-audit/di/BookingAuditRepository.module";
import { moduleLoader as auditActorRepositoryModuleLoader } from "@scheduling/features/booking-audit/di/AuditActorRepository.module";
import { moduleLoader as attendeeRepositoryModuleLoader } from "@scheduling/features/bookings/di/Attendee.module";
import { moduleLoader as featuresRepositoryModuleLoader } from "@scheduling/features/di/modules/FeaturesRepository";
import { moduleLoader as userRepositoryModuleLoader } from "@scheduling/features/di/modules/User";

import { createModule, bindModuleToClassOnToken } from "../../di/di";

export const bookingAuditTaskConsumerModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_TASK_CONSUMER;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_TASK_CONSUMER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: bookingAuditTaskConsumerModule,
  moduleToken,
  token,
  classs: BookingAuditTaskConsumer,
  depsMap: {
    bookingAuditRepository: bookingAuditRepositoryModuleLoader,
    auditActorRepository: auditActorRepositoryModuleLoader,
    featuresRepository: featuresRepositoryModuleLoader,
    attendeeRepository: attendeeRepositoryModuleLoader,
    userRepository: userRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
