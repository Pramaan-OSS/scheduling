import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { webhookRouter } from "@scheduling/trpc/server/routers/viewer/webhook/_router";

export default createNextApiHandler(webhookRouter);
