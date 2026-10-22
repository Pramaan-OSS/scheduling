import type { z } from "zod";
import { triggerNoShowPayloadSchema } from "./schema";
export const getMeetingSessionsFromRoomName = async (_roomName: string): Promise<z.infer<typeof triggerNoShowPayloadSchema>> => { throw new Error("Meeting attendance is not available yet."); };
