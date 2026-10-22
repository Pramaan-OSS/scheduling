import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { featureFlagRouter } from "@scheduling/trpc/server/routers/features/_router";

export default createNextApiHandler(featureFlagRouter, true, "features");
