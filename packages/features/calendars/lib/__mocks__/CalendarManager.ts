import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as CalendarManager from "../CalendarManager";

vi.mock("@scheduling/features/calendars/lib/CalendarManager", () => CalendarManagerMock);

beforeEach(() => {
  mockReset(CalendarManagerMock);
});

const CalendarManagerMock = mockDeep<typeof CalendarManager>();
export default CalendarManagerMock;
