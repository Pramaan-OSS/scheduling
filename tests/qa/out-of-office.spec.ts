import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("out of office create, edit and delete", async ({ page }) => {
  await page.goto("/settings/my-account/out-of-office");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByRole("dialog").locator('textarea[name="notes"]').fill("QA absence");
  await expect(page.getByRole("dialog")).not.toContainText("Team plan required");
  await page.getByRole("dialog").getByRole("button", { name: "Create", exact: true }).click();
  await page.getByTestId("ooo-edit-n-a").filter({ visible: true }).first().click();
  await page.getByRole("dialog").locator('textarea[name="notes"]').fill("QA absence edited");
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await page.getByTestId("ooo-delete-n-a").filter({ visible: true }).first().click();
  await expect(page.getByTestId("ooo-edit-n-a").filter({ visible: true })).toHaveCount(0);
});
