import { afterEach, expect, test, vi } from "vitest";
import { FeaturesRepository } from "./features.repository";
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
test("without an override the product's own sender is used and the flag decides", async () => {
  vi.stubEnv("EMAIL_FROM", "");
  const repository = new FeaturesRepository({} as any);
  const read = vi.spyOn(repository, "getAllFeatures").mockResolvedValue([{ slug: "email-verification", enabled: true } as any]);
  expect(await repository.checkIfFeatureIsEnabledGlobally("email-verification")).toBe(true);
  expect(read).toHaveBeenCalledTimes(1);
});
test("a configured sender still respects the administrator's verification flag", async () => {
  vi.stubEnv("EMAIL_FROM", "host@example.test");
  const repository = new FeaturesRepository({} as any);
  vi.spyOn(repository, "getAllFeatures").mockResolvedValue([{ slug: "email-verification", enabled: true } as any]);
  expect(await repository.checkIfFeatureIsEnabledGlobally("email-verification")).toBe(true);
  vi.spyOn(repository, "getAllFeatures").mockResolvedValue([{ slug: "email-verification", enabled: false } as any]);
  expect(await repository.checkIfFeatureIsEnabledGlobally("email-verification")).toBe(false);
});
