import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { apiKeysRouter } from "@scheduling/trpc/server/routers/viewer/apiKeys/_router";

export default createNextApiHandler(apiKeysRouter);