import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { authRouter } from "@scheduling/trpc/server/routers/viewer/auth/_router";

export default createNextApiHandler(authRouter);
