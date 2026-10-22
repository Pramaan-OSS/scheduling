import type { IncomingHttpHeaders } from "node:http";
import type { EventTypeRepository } from "@scheduling/features/eventtypes/repositories/eventTypeRepository";
import type { FeaturesRepository } from "@scheduling/features/flags/features.repository";
import { checkCfProofToken } from "@scheduling/lib/server/checkCfProofToken";
export class BotDetectionService {
  constructor(_features: FeaturesRepository, _eventTypes: EventTypeRepository) {}
  async checkBotDetection({ headers }: { eventTypeId?: number; headers: IncomingHttpHeaders }) {
    if (process.env.SCHEDULING_BOT_CHECK_ENABLED !== "1") return;
    const token = headers["x-booking-challenge"];
    await checkCfProofToken({ token: typeof token === "string" ? token : undefined, remoteIp: "" });
  }
}
