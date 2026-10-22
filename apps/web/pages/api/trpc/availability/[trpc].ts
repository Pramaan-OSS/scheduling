import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { availabilityRouter } from "@scheduling/trpc/server/routers/viewer/availability/_router";

export default createNextApiHandler(availabilityRouter);
