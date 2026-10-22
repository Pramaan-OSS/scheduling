import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("editor tabs load their controls without missing script files", async ({ page }) => {
  const missing: string[] = [];
  page.on("response", response => { if (new URL(response.url()).pathname.startsWith("/_next/static/") && response.status() >= 400) missing.push(new URL(response.url()).pathname); });
  for (const tab of ["setup", "limits", "advanced", "recurring", "apps"]) {
    const response = await page.goto(`/event-types/4?tabName=${tab}`);
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    await expect(page.locator('a[href^="/help/"], a[href^="/docs/"]')).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/Application error|Something went wrong/);
  }
  expect(missing).toEqual([]);
});
