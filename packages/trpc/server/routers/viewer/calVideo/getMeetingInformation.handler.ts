import { TRPCError } from "@trpc/server";
import type { TGetMeetingInformationInputSchema } from "./getMeetingInformation.schema";
export const getMeetingInformationHandler = async (_options: { ctx: unknown; input: TGetMeetingInformationInputSchema }) => { throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Meeting attendance is not available yet." }); };
