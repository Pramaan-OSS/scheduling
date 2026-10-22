import { z } from "zod";
import { TRPCError } from "@trpc/server";
import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
export const feedbackRouter = router({ submitFeedback: authedProcedure.input(z.object({ surveyId: z.string(), data: z.record(z.union([z.string(), z.number()])) })).mutation(() => { throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Feedback surveys are not available yet." }); }) });
