import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("API key create, edit and revoke", async ({ page }) => {
  const name = `QA key ${Date.now()}`;
  await page.goto("/settings/developer/api-keys");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByRole("dialog").getByLabel("Name this key", { exact: true }).filter({ visible: true }).fill(name);
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Done", exact: true }).click();
  const row = (text: string) => page.getByText(text, { exact: true }).locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
  await row(name).getByRole("button").click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Name this key", { exact: true }).filter({ visible: true }).fill(`${name} edited`);
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await row(`${name} edited`).getByRole("button").click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Revoke this API key", exact: true }).click();
  await expect(page.getByText(`${name} edited`, { exact: true })).toHaveCount(0);
});
