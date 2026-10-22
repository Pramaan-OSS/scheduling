import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BookingRefund } from "./BookingRefund";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function responses(available = true, fail = false) {
  const fetch = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === "POST") {
      if (fail) throw new Error("lost answer");
      return new Response(JSON.stringify({ status: "pending", message: "Refund requested. Completion is not confirmed." }));
    }
    return new Response(JSON.stringify({ payments: [{ id: 1, amount: 2500, currency: "USD", available,
      message: available ? "Review the amount." : "Refund this payment outside the product." }] }));
  });
  vi.stubGlobal("fetch", fetch); return fetch;
}
test("host approval is required, changing the amount clears approval, and pending cannot be resent", async () => {
  const fetch = responses(); render(<BookingRefund bookingUid="fixture-booking" />);
  const button = await screen.findByRole("button", { name: "Request refund" });
  expect(button.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "5.00" } });
  expect(button.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(button);
  await screen.findByText("Refund requested. Completion is not confirmed.");
  const posts = fetch.mock.calls.filter(([, options]) => options?.method === "POST");
  expect(posts).toHaveLength(1);
  expect(JSON.parse(posts[0][1]!.body as string)).toMatchObject({ approved: true, amount: 500 });
  expect(button.hasAttribute("disabled")).toBe(true); fireEvent.click(button);
  expect(fetch.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
});
test("missing reference displays outside guidance without a refund control", async () => {
  responses(false); render(<BookingRefund bookingUid="fixture-booking" />);
  await screen.findByText("Refund this payment outside the product.");
  expect(screen.queryByRole("button", { name: "Request refund" })).toBeNull();
});
test("a lost browser answer remains uncertain and cannot be resent", async () => {
  const fetch = responses(true, true); render(<BookingRefund bookingUid="fixture-booking" />);
  const button = await screen.findByRole("button", { name: "Request refund" });
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(button);
  await waitFor(() => expect(screen.getByText("The refund result is uncertain. Check its status before taking further action.")).toBeTruthy());
  expect(button.hasAttribute("disabled")).toBe(true);
  expect(fetch.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
});
