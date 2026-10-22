import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("onboarding opens account details without a retired plan choice", async ({ page }) => {
  await page.goto("/onboarding/getting-started");
  await expect(page).toHaveURL(/onboarding\/personal\/settings/);
  await expect(page.getByText("Add your details", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Select plan|\$15|With my team/);
  await page.goto("/event-types?welcomeToSchedulingModal=true");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).not.toContainText(/Cal Video|Cal\.ai|Unlimited calendars/);
  await page.getByRole("dialog").getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
