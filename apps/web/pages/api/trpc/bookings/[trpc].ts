import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { bookingsRouter } from "@scheduling/trpc/server/routers/viewer/bookings/_router";

export default createNextApiHandler(bookingsRouter);
