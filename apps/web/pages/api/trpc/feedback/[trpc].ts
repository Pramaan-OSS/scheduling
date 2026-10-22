import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { feedbackRouter } from "@scheduling/trpc/server/routers/viewer/feedback/_router";

export default createNextApiHandler(feedbackRouter);
