import { expect, test, vi } from "vitest";
import { Tasker } from "./Tasker";
class Worker extends Tasker<{ send: () => Promise<string> }> {}
test("dispatches to the application worker once without a failure fallback", async () => {
  const sync = vi.fn().mockRejectedValue(new Error("unknown result"));
  const outside = vi.fn().mockResolvedValue("sent");
  const worker = new Worker({ syncTasker: { send: sync }, asyncTasker: { send: outside }, logger: { log: vi.fn(), silly: vi.fn(), trace: vi.fn(), getSubLogger: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } });
  await expect(worker.dispatch("send")).rejects.toThrow("unknown result");
  expect(sync).toHaveBeenCalledTimes(1); expect(outside).not.toHaveBeenCalled();
});
