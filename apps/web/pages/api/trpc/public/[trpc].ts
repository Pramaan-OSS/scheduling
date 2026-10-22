import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { publicViewerRouter } from "@scheduling/trpc/server/routers/publicViewer/_router";

export default createNextApiHandler(publicViewerRouter, true);
