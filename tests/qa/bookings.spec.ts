import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("booking navigation has no nested links and status lists open", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", message => { if (message.type() === "error" && /cannot contain|hydration/i.test(message.text())) errors.push(message.text()); });
  for (const status of ["upcoming", "unconfirmed", "past", "cancelled"]) {
    await page.goto(`/bookings/${status}`);
    await expect(page.getByRole("heading", { name: "Bookings", exact: true })).toBeVisible();
    await expect(page.locator("a a")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
