import { createModule } from "@scheduling/features/di/di";
import { DI_TOKENS } from "@scheduling/features/di/tokens";

import { NoopRedisService } from "../NoopRedisService";
import { RedisService } from "../RedisService";

const redisModule = createModule();

redisModule.bind(DI_TOKENS.REDIS_CLIENT).toFactory(() => {
  if (process.env.REDIS_URL) {
    return new RedisService();
  }
  return new NoopRedisService();
}, "singleton");

export { redisModule };
