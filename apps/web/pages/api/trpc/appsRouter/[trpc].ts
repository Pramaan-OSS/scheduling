import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { appsRouter } from "@scheduling/trpc/server/routers/viewer/apps/_router";

export default createNextApiHandler(appsRouter);
