import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { adminRouter } from "@scheduling/trpc/server/routers/viewer/admin/_router";

export default createNextApiHandler(adminRouter);
