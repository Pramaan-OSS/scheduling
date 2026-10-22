import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { loggedInViewerRouter } from "@scheduling/trpc/server/routers/loggedInViewer/_router";

export default createNextApiHandler(loggedInViewerRouter);
