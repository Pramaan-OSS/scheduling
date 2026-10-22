import { expect, test, vi } from "vitest";
import http from "./http";

test("the retired server transport cannot send requests or refresh tokens", async () => {
  const adapter = vi.fn();
  const previousAdapter = http.instance.defaults.adapter;
  http.instance.defaults.adapter = adapter;
  try {
    http.setUrl("https://unused.example.test");
    await expect(http.get("/bookings")).rejects.toThrow("not available yet");
    await expect(http.refreshTokens("https://unused.example.test/refresh")).rejects.toThrow("not available yet");
    expect(adapter).not.toHaveBeenCalled();
  } finally {
    http.instance.defaults.adapter = previousAdapter;
    http.setUrl("");
  }
});
