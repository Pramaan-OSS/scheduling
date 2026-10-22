import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { holidaysRouter } from "@scheduling/trpc/server/routers/viewer/holidays/_router";

export default createNextApiHandler(holidaysRouter);
