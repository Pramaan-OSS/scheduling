import { createClient } from "redis";
import type { IRedisService } from "./IRedisService";
export class RedisService implements IRedisService {
  private redis = createClient({ url: process.env.REDIS_URL });
  private ready: Promise<unknown>;
  constructor() {
    if (!process.env.REDIS_URL) throw new Error("Set REDIS_URL for the application cache.");
    this.redis.on("error", () => {});
    this.ready = this.redis.connect();
  }
  async get<T>(key: string): Promise<T | null> { await this.ready; const value = await this.redis.get(key); return value === null ? null : JSON.parse(value); }
  async del(key: string) { await this.ready; return this.redis.del(key); }
  async set<T>(key: string, value: T, options?: { ttl?: number }): Promise<"OK" | T | null> { await this.ready; const result = await this.redis.set(key, JSON.stringify(value), options?.ttl ? { PX: options.ttl } : undefined); return result === "OK" ? "OK" : null; }
  async expire(key: string, seconds: number): Promise<0 | 1> { await this.ready; return await this.redis.expire(key, seconds) ? 1 : 0; }
  async lrange<T = string>(key: string, start: number, end: number): Promise<T[]> { await this.ready; return (await this.redis.lRange(key, start, end)).map(value => JSON.parse(value)); }
  async lpush<T>(key: string, ...items: T[]) { await this.ready; return this.redis.lPush(key, items.map(value => JSON.stringify(value))); }
  async incrementWindow(key: string, milliseconds: number): Promise<number> {
    await this.ready;
    return Number(await this.redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; return n", { keys: [key], arguments: [String(milliseconds)] }));
  }
}
