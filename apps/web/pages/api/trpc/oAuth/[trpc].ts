import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { oAuthRouter } from "@scheduling/trpc/server/routers/viewer/oAuth/_router";

export default createNextApiHandler(oAuthRouter);
