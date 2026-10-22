import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { z } from "zod";
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/event-types/4" }));
vi.mock("./useRouterQuery", () => ({ useRouterQuery: () => ({}) }));
import { useTypedQuery } from "./useTypedQuery";
beforeEach(() => { window.history.replaceState({}, "", "/event-types/4?keep=review"); replace.mockClear(); });
afterEach(() => vi.restoreAllMocks());
it("adds missing defaults once without server navigation or dropping other query values", () => {
  const history = vi.spyOn(window.history, "replaceState");
  const { rerender } = renderHook(() => useTypedQuery(z.object({ tabName: z.string().default("setup"), page: z.string().default("1") })));
  for (let i = 0; i < 5; i++) rerender();
  expect(replace).not.toHaveBeenCalled();
  expect(history).toHaveBeenCalledTimes(1);
  expect(window.location.search).toBe("?keep=review&tabName=setup&page=1");
});
it("preserves an explicit tab value", () => {
  window.history.replaceState({}, "", "/event-types/4?tabName=limits");
  const history = vi.spyOn(window.history, "replaceState");
  renderHook(() => useTypedQuery(z.object({ tabName: z.string().default("setup") })));
  expect(history).not.toHaveBeenCalled();
  expect(window.location.search).toBe("?tabName=limits");
});
