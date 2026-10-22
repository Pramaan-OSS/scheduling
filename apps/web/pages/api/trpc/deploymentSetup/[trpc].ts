import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { deploymentSetupRouter } from "@scheduling/trpc/server/routers/viewer/deploymentSetup/_router";

export default createNextApiHandler(deploymentSetupRouter);
