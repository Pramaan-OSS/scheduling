import { vi } from "vitest";

export const getCredentialForSelectedCalendar = vi.fn();

vi.mock("@scheduling/app-store/delegationCredential", () => ({
  getCredentialForSelectedCalendar,
}));
