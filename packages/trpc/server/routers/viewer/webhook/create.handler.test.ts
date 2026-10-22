import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), schedule: vi.fn() }));
vi.mock("@scheduling/prisma", () => ({ prisma: { webhook: { create: mocks.create } } }));
vi.mock("@scheduling/features/webhooks/lib/scheduleTrigger", () => ({ updateTriggerForExistingBookings: mocks.schedule }));
vi.mock("@scheduling/lib/ssrfProtection", () => ({ validateUrlForSSRFSync: () => ({ isValid: true }) }));
import { createHandler } from "./create.handler";

beforeEach(() => { vi.clearAllMocks(); mocks.schedule.mockResolvedValue(undefined); });
it.each([false, true])("creating a webhook with active=%s respects its delivery choice", async active => {
  const webhook = { id: "fixture-webhook", active, eventTriggers: ["MEETING_STARTED"] };
  mocks.create.mockResolvedValue(webhook);
  const result = await createHandler({ ctx: { user: { id: 1, role: "ADMIN" } as never }, input: { subscriberUrl: "https://hooks.example.test/booking", active, eventTriggers: ["MEETING_STARTED"], payloadTemplate: null } });
  expect(result).toBe(webhook);
  expect(mocks.schedule).toHaveBeenCalledTimes(active ? 1 : 0);
  if (active) expect(mocks.schedule).toHaveBeenCalledWith(webhook, [], ["MEETING_STARTED"]);
});
