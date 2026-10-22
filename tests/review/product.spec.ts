import { test, expect } from "@playwright/test";
import fs from "node:fs";
test.beforeEach(async ({ context }) => {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
});
const fixture = JSON.parse(fs.readFileSync(".runtime/browser-fixture.json", "utf8"));
async function signIn(page: any) {
  await page.goto("/auth/login");
  await page.locator("input[name=email]").fill(fixture.email);
  await page.locator("input[name=password]").fill(fixture.password);
  await page.getByRole("button", { name: "Continue", exact: true }).first().click();
  await expect(page).not.toHaveURL(/auth\/login/);
}
test("local sign-in and settings survive hard loads", async ({ page }) => {
  await signIn(page);
  for (const path of [
    "/event-types",
    "/settings/my-account/profile",
    "/settings/my-account/appearance",
    "/availability",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Traceback");
  }
  await page.screenshot({ path: ".runtime/settings-desktop.png", fullPage: true });
});
test("public booking has local fonts and fits a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fixture-host/conversation");
  await expect(page.getByText("A short conversation").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Something went wrong");
  await expect(page.getByText("Today", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("Geist");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".runtime/booking-phone.png", fullPage: true });
});
test("outside booking actions explain the missing key and are disabled", async ({ page }) => {
  await signIn(page);
  await page.goto("/booking/fixture-booking");
  await expect(page.getByRole("region", { name: "Contact destination" })).toBeVisible();
  await expect(
    page.getByText("This needs a Pramaan key. Ask your administrator to set PRAMAAN_API_KEY.").first()
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Find contact destinations" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Get estimate", exact: true })).toBeDisabled();
});
test("contact estimate precedes a single approved action", async ({ page }) => {
  await signIn(page);
  const actions: string[] = [];
  await page.route("**/api/booking-contact/fixture-booking", async (route) => {
    const req = route.request();
    if (req.method() === "GET")
      return route.fulfill({
        json: {
          configured: true,
          fields: [{ key: "email", label: "Email", required: true, maxLength: 200 }],
          values: { email: "guest@example.test" },
        },
      });
    const body = req.postDataJSON();
    actions.push(body.action);
    if (body.action === "estimate")
      return route.fulfill({
        json: { reviewId: "fixture-review", input: { email: "guest@example.test" }, priceMaxMicro: 1500 },
      });
    return route.fulfill({ json: { status: "done", message: "Contact created." } });
  });
  await page.goto("/booking/fixture-booking");
  await page.getByRole("button", { name: "Review contact estimate" }).click();
  await expect(page.getByText("Maximum cost: USD 0.001500")).toBeVisible();
  expect(actions).toEqual(["estimate"]);
  await page.getByRole("button", { name: "Approve and create contact" }).click();
  await expect(page.getByText("Contact created.", { exact: true })).toBeVisible();
  expect(actions).toEqual(["estimate", "run"]);
  await page.waitForTimeout(250);
  expect(actions).toEqual(["estimate", "run"]);
});
test("missing pages stay neutral", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/Traceback|\/Users\/|Error:.*at /);
});

test("a guest can confirm a local booking without an outside key", async ({ page }) => {
  await page.goto("/fixture-host/conversation");
  await page
    .getByRole("button", { name: /^\d{1,2}:\d{2}(am|pm)$/ })
    .first()
    .click();
  await page.locator('input[name="name"]').fill("Local Fixture Guest");
  await page.locator('input[name="email"]').fill("local-guest@example.test");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page).toHaveURL(/\/booking\//);
  await expect(
    page.getByText(/This meeting is scheduled|Booking confirmed|You are scheduled/i).first()
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Something went wrong");
});

test("calendar setup and sign-in errors use neutral connection text", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings/my-account/calendars");
  await expect(page.getByText("Your meeting app", { exact: true })).toBeVisible();
  await expect(page.getByText("Your short-link app", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Google Meet|Google Calendar|Microsoft Teams|Outlook|Gmail|Zapier|WhatsApp/i);
  await page.goto("/auth/error?error=wrong-provider&provider=GOOGLE");
  await expect(page.locator("body")).toContainText("your connected account");
  await expect(page.locator("body")).not.toContainText(/Google|Microsoft|Okta|Traceback/i);
});
