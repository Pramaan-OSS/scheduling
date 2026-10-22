import { expect, test, vi } from "vitest";
import { BotDetectionService } from "./BotDetectionService";
vi.mock("@scheduling/lib/server/checkCfProofToken", () => ({ checkCfProofToken: vi.fn().mockRejectedValue(new Error("A challenge proof is required.")) }));
test("a required challenge cannot silently pass without a proof", async () => { vi.stubEnv("SCHEDULING_BOT_CHECK_ENABLED", "1"); try { const service = new BotDetectionService({} as never, {} as never); await expect(service.checkBotDetection({ headers: {} })).rejects.toThrow("proof is required"); } finally { vi.unstubAllEnvs(); } });
