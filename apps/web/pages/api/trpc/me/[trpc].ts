import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { meRouter } from "@scheduling/trpc/server/routers/viewer/me/_router";

export default createNextApiHandler(meRouter);
