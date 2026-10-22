import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { calendarsRouter } from "@scheduling/trpc/server/routers/viewer/calendars/_router";

export default createNextApiHandler(calendarsRouter);
