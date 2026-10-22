import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { oooRouter } from "@scheduling/trpc/server/routers/viewer/ooo/_router";

export default createNextApiHandler(oooRouter);
