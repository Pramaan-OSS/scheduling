import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("event type create, edit, save and delete", async ({ page }) => {
  await page.goto("/event-types");
  await page.getByRole("link", { name: "New", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const title = `QA lifecycle ${Date.now()}`;
  await dialog.getByLabel("Title", { exact: true }).filter({ visible: true }).fill(title);
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/event-types\/\d+/);
  await page.locator('input[name="title"]').filter({ visible: true }).fill(`${title} edited`);
  const saved = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname.includes("eventTypes") && response.ok());
  await page.getByTestId("update-eventtype").filter({ visible: true }).click();
  await saved;
  await page.reload();
  await expect(page.locator('input[name="title"]').filter({ visible: true })).toHaveValue(`${title} edited`);
  await page.getByRole("button", { name: "Delete", exact: true }).filter({ visible: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete event type", exact: true }).click();
  await expect(page).toHaveURL(/event-types$/);
});

test("opening an editor does not request the page again to set a default tab", async ({ page }) => {
  await page.goto("/event-types");
  await page.locator('a[href^="/event-types/"]').filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/event-types\/\d+/);
  await page.waitForLoadState("networkidle");
  let repeated = 0;
  page.on("request", request => {
    if (request.isNavigationRequest() && /\/event-types\/\d+/.test(new URL(request.url()).pathname)) repeated++;
  });
  await expect(page.locator('input[name="title"]').filter({ visible: true })).toBeVisible();
  await page.waitForTimeout(1500);
  expect(repeated).toBe(0);
});
