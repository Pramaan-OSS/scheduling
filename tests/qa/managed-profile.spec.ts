import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("managed profile has a neutral identity label and cannot disconnect its only sign-in", async ({ page }) => {
  await page.goto("/settings/my-account/profile");
  await expect(page.getByText("Managed sign-in", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Disconnect", exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/\bSaml\b|Google|Microsoft/);
  await page.goto("/settings/security/password");
  await expect(page.locator("body")).toContainText("managed sign-in");
  await expect(page.locator("body")).not.toContainText(/SAML|GOOGLE|MICROSOFT/);
});
