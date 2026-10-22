import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => {
  await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
});
test("a fresh local install loads and renders its configured calendar screen", async ({ page, request }) => {
  const noKey = process.env.ZERO_TEST_NO_KEY === "1";
  const response = await page.goto("/auth/login");
  expect(response?.status()).toBe(200);
  if (noKey) await expect(page.getByText("Add PRAMAAN_API_KEY to .env", { exact: true }).first()).toBeVisible();
  const account = { email: "zero-fixture@example.test", username: "zero-fixture", password: "Fixture-Local-42!", name: "Local Fixture", language: "en" };
  if (page.url().includes("/auth/setup")) {
    const created = await request.post("/api/auth/setup", { data: { username: account.username, full_name: account.name, email_address: account.email, password: account.password } });
    expect(created.status()).toBe(200);
  } else {
    const created = await request.post("/api/auth/signup", { data: account });
    expect([201, 409]).toContain(created.status());
  }
  await page.goto("/auth/login");
  await page.locator("input[name=email]").fill(account.email);
  await page.locator("input[name=password]").fill(account.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  await page.goto("/settings/my-account/calendars");
  await expect(page.locator("body")).not.toContainText(/Something went wrong|Traceback/);
  if (noKey) await expect(page.getByText("Add PRAMAAN_API_KEY to .env", { exact: true }).first()).toBeVisible();
  else await expect(page.getByRole("checkbox", { name: "Primary calendar (Primary)", exact: true })).toBeVisible();
});
