import { createHash } from "node:crypto";
import { RedisService } from "@scheduling/features/redis/RedisService";
import { isIpInBanListString } from "./getIP";
export type RatelimitResponse = { success: boolean; limit: number; remaining: number; reset: number };
export type RateLimitHelper = { rateLimitingType?: "core" | "forcedSlowMode" | "common" | "api" | "ai" | "sms" | "smsMonth" | "instantMeeting"; identifier: string; opts?: Record<string, unknown>; onRateLimiterResponse?: (response: RatelimitResponse) => void };
export const API_KEY_RATE_LIMIT = 30;
const limits = { core: [10, 60_000], common: [200, 60_000], api: [30, 60_000], ai: [20, 86400_000], forcedSlowMode: [1, 30_000], instantMeeting: [1, 600_000], sms: [50, 300_000], smsMonth: [250, 30 * 86400_000] };
const windows = new Map<string, { count: number; reset: number }>();
let redis: RedisService | undefined;
export function rateLimiter() {
  return async ({ rateLimitingType = "core", identifier }: RateLimitHelper): Promise<RatelimitResponse> => {
    const kind = isIpInBanListString(identifier) ? "forcedSlowMode" : rateLimitingType;
    const [limit, duration] = limits[kind]; const now = Date.now();
    const reset = (Math.floor(now / duration) + 1) * duration;
    const key = `limit:${kind}:${createHash("sha256").update(identifier).digest("hex")}:${reset}`;
    let count: number;
    if (process.env.REDIS_URL) {
      redis ||= new RedisService();
      try { count = await redis.incrementWindow(key, reset - now); }
      catch { return { success: false, limit, remaining: 0, reset }; }
    } else {
      if (windows.size >= 10_000) for (const [id, value] of windows) if (value.reset <= now) windows.delete(id);
      if (windows.size >= 10_000 && !windows.has(key)) return { success: false, limit, remaining: 0, reset };
      const window = windows.get(key) || { count: 0, reset };
      count = ++window.count; windows.set(key, window);
    }
    return { success: count <= limit, limit, remaining: Math.max(0, limit - count), reset };
  };
}
