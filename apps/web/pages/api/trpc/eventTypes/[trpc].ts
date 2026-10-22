import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { eventTypesRouter } from "@scheduling/trpc/server/routers/viewer/eventTypes/_router";

export default createNextApiHandler(eventTypesRouter);
