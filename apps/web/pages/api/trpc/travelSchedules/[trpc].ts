import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { travelSchedulesRouter } from "@scheduling/trpc/server/routers/viewer/travelSchedules/_router";

export default createNextApiHandler(travelSchedulesRouter);
