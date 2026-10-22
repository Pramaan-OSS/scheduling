import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(), warn: vi.fn() }));
vi.mock("@scheduling/emails/email-manager", () => ({ sendRescheduledEmailsAndSMS: mocks.send }));
import { BookingActionMap, BookingEmailSmsHandler } from "./BookingEmailSmsHandler";
const payload = { action: BookingActionMap.rescheduled, data: { evt: {}, eventType: { schedulingType: null } } } as Parameters<BookingEmailSmsHandler["send"]>[0];
const handler = () => new BookingEmailSmsHandler({ logger: { getSubLogger: () => ({ warn: mocks.warn, debug: vi.fn(), error: vi.fn() }) } as any });
beforeEach(() => { vi.clearAllMocks(); mocks.send.mockRejectedValue(new Error("Notification unavailable")); });
it("keeps a saved booking successful when its notification fails, without retrying", async () => {
  await expect(handler().sendAfterBookingSaved(payload)).resolves.toBeUndefined();
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.warn).toHaveBeenCalledWith(expect.stringContaining("booking is saved"));
});
it("keeps delivery task failures visible to their caller", async () => {
  await expect(handler().send(payload)).rejects.toThrow("Notification unavailable");
  expect(mocks.send).toHaveBeenCalledTimes(1);
});
