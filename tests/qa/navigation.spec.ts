import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("command billing and meeting settings open working local screens", async ({ page }) => {
  await page.goto("/event-types");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByPlaceholder("Type a command or search...").filter({ visible: true }).fill("Manage billing");
  await page.getByText("Manage billing", { exact: true }).click();
  await expect(page).toHaveURL(/settings\/my-account\/payments/);
  await page.goto("/settings/my-account/conferencing");
  await page.getByRole("link", { name: "Calendar settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your meeting app", exact: true })).toBeVisible();
});

test("unknown pages show a neutral error and public booking fits a phone", async ({ page }) => {
  const response = await page.goto("/missing-page-for-qa");
  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText(/Traceback|\/Users\/|Application error/);
  await expect(page.getByTestId("404-page").filter({ visible: true }).locator('a[href*="/docs"], a[href*="/blog"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("is still available");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/event-types");
  await expect(page.getByRole("link", { name: "New", exact: true })).toBeVisible();
  await expect(page.getByTestId("event-types").filter({ visible: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".scratch/qa/dashboard-phone.png", fullPage: true });
  const fixture = JSON.parse(readFileSync(".scratch/qa/fixtures.json", "utf8"));
  await page.goto(`/${fixture.username}/qa-public`);
  await expect(page.getByRole("button", { name: /^\d{1,2}:\d{2}(am|pm)?$/ }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".scratch/qa/public-phone.png", fullPage: true });
});
