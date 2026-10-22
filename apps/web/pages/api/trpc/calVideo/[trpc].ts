import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { calVideoRouter } from "@scheduling/trpc/server/routers/viewer/calVideo/_router";

export default createNextApiHandler(calVideoRouter);
