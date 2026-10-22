import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("unavailable booking research never starts a run", async ({ page }) => {
  let runs = 0;
  page.on("request", request => { if (new URL(request.url()).pathname.includes("/api/booking-outcomes/") && request.method() === "POST" && request.postDataJSON()?.action === "run") runs++; });
  await page.goto("/booking/qa-booking-6");
  await expect(page.getByRole("region", { name: "Booking actions", exact: true })).toBeVisible();
  await page.getByLabel("Company website domain", { exact: true }).filter({ visible: true }).fill("example.test");
  await page.getByRole("button", { name: "Get estimate", exact: true }).click();
  await expect(page.getByText(/not available/i).filter({ visible: true }).first()).toBeVisible();
  expect(runs).toBe(0);
});

test("contact discovery, connection and estimate precede one approved contact", async ({ page, baseURL }) => {
  const uid = "qa-booking-7";
  await page.route("https://connection.example.test/**", route => route.fulfill({ status: 302, headers: { location: `${baseURL}/booking/${uid}` } }));
  await page.goto(`/booking/${uid}`);
  const section = page.getByRole("region", { name: "Contact destination", exact: true });
  await expect(section).toBeVisible();
  const acknowledge = section.getByRole("button", { name: "I checked the destination — review a fresh estimate", exact: true });
  if (await acknowledge.count()) await acknowledge.click();
  if (!(await section.getByRole("button", { name: "Review contact estimate", exact: true }).count())) {
    await section.getByRole("checkbox", { name: "I approve the cost of searching one page.", exact: true }).check();
    await section.getByRole("button", { name: "Find contact destinations", exact: true }).click();
    await section.getByRole("checkbox", { name: "I can share these details and approve the connection's access.", exact: true }).check();
    await section.getByRole("button", { name: "Connect destination 1", exact: true }).click();
  }
  await section.getByRole("button", { name: "Review contact estimate", exact: true }).click();
  await expect(section.getByText(/Maximum cost:/)).toBeVisible();
  let runs = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === `/api/booking-contact/${uid}` && request.method() === "POST" && request.postDataJSON()?.action === "run") runs++; });
  await section.getByRole("button", { name: "Approve and create contact", exact: true }).click();
  await expect(section.getByText("The contact action finished. Check the destination before creating another contact.", { exact: true })).toBeVisible();
  expect(runs).toBe(1);
});
