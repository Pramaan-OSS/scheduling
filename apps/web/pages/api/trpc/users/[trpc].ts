import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { userAdminRouter } from "@scheduling/trpc/server/routers/viewer/users/_router";

export default createNextApiHandler(userAdminRouter);
