import { vi } from "vitest";

vi.mock("@scheduling/features/bookings/components/Header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => <div data-testid="header">{children}</div>,
}));
