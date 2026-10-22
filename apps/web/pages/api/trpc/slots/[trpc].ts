import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { slotsRouter } from "@scheduling/trpc/server/routers/viewer/slots/_router";

export default createNextApiHandler(slotsRouter);
