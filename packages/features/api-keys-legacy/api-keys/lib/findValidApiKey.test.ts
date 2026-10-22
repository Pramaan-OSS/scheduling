import { afterEach, expect, it, vi } from "vitest";
import { hashAPIKey, apiKeyPrefix } from "./apiKeys";
const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@scheduling/prisma", () => ({ default: { apiKey: { findFirst } } }));
import findValidApiKey from "./findValidApiKey";
afterEach(() => { vi.unstubAllEnvs(); findFirst.mockReset(); });
it("checks newly issued default keys against the stored hash", async () => {
  vi.stubEnv("API_KEY_PREFIX", undefined);
  const raw = "fixture-raw-key";
  findFirst.mockResolvedValue({ id: "fixture" });
  await expect(findValidApiKey(apiKeyPrefix() + raw)).resolves.toEqual({ id: "fixture" });
  expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ hashedKey: hashAPIKey(raw) }) }));
});
it("keeps custom, historical and unprefixed stored keys valid without changing stored hashes", async () => {
  vi.stubEnv("API_KEY_PREFIX", "owned_");
  for (const value of ["owned_fixture-raw-key", "cal_fixture-raw-key", "fixture-raw-key"]) {
    await findValidApiKey(value);
    expect(findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ hashedKey: hashAPIKey("fixture-raw-key") }) }));
  }
});
