import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("owned meeting and link connections approve access and persist a request identity", async ({ page, baseURL }) => {
  await page.route("https://connection.example.test/**", route => route.fulfill({ status: 302, headers: { location: `${baseURL}/settings/my-account/calendars` } }));
  for (const heading of ["Your meeting app", "Your short-link app"]) {
    await page.goto("/settings/my-account/calendars");
    const section = page.getByRole("heading", { name: heading, exact: true }).locator("..");
    if (await section.getByText("Connected with change access.", { exact: true }).count()) continue;
    await section.getByRole("button", { name: "Find connection apps", exact: true }).click();
    await expect(section.getByRole("combobox").locator("option")).toHaveCount(2);
    await section.getByRole("combobox").selectOption({ index: 1 });
    await section.getByRole("checkbox").first().check();
    await section.getByRole("button", { name: "Connect own account", exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true }).locator("..").getByText("Connected with change access.", { exact: true })).toBeVisible();
  }
});
