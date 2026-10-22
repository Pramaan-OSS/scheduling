import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { credentialsRouter } from "@scheduling/trpc/server/routers/viewer/credentials/_router";

export default createNextApiHandler(credentialsRouter);
