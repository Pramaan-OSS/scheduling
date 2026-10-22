import type { Tracking } from "@scheduling/prisma/client";

export interface TrackingRepositoryInterface {
  findByBookingUid(bookingUid: string): Promise<Tracking | null>;
}
