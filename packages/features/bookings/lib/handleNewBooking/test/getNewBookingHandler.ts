import type { BookingHandlerInput } from "@scheduling/features/bookings/lib/dto/types";

async function handler(input: BookingHandlerInput) {
  const { getRegularBookingService } = await import(
    "@scheduling/features/bookings/di/RegularBookingService.container"
  );
  const regularBookingService = getRegularBookingService();
  const { bookingData, ...bookingMeta } = input;
  return regularBookingService.createBooking({
    bookingData,
    bookingMeta,
  });
}

export function getNewBookingHandler() {
  return handler;
}
