import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
const fixture = JSON.parse(readFileSync(".scratch/qa/fixtures.json", "utf8"));
test.use({ storageState: { cookies: [], origins: [] } });
for (const partial of [true, false]) {
test(`guest payment and host-approved ${partial ? "partial" : "full"} refund`, async ({ page, context, browser, baseURL }) => {
  if (existsSync(".scratch/qa/payments-paid.json")) unlinkSync(".scratch/qa/payments-paid.json");
  await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto(`/${fixture.username}/qa-checkout`);
  await page.getByRole("button", { name: /^\d{1,2}:\d{2}(am|pm)$/ }).first().click();
  await page.locator('input[name="name"]').fill("QA checkout guest");
  await page.locator('input[name="email"]').fill("checkout-guest@example.test");
  const created = page.waitForResponse(response => new URL(response.url()).pathname === "/api/book/event" && response.request().method() === "POST");
  await page.getByRole("button", { name: /^(Confirm|Pay|Book)/ }).first().click();
  const response = await created; expect(response.ok()).toBe(true);
  const booking = await response.json();
  expect(booking.paymentUid).toBeTruthy();
  await page.goto(`/payment/${booking.paymentUid}`);
  await page.getByRole("button", { name: "Check payment", exact: true }).click();
  await expect(page.getByRole("link", { name: "Continue to payment", exact: true })).toHaveAttribute("href", /^https:\/\/payment\.example\.test\//);
  await expect(page.getByRole("status")).not.toContainText("Payment confirmed.");
  const checkouts = JSON.parse(readFileSync(".scratch/qa/checkouts.json", "utf8"));
  writeFileSync(".scratch/qa/payments-paid.json", JSON.stringify(checkouts.map(([ref]: [string]) => ref)), { mode: 0o600 });
  await page.getByRole("button", { name: "Check payment", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Payment confirmed.");
  const host = await browser.newContext({ storageState: ".scratch/qa/session.json", timezoneId: "Europe/London" });
  try {
    await host.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    const hostPage = await host.newPage();
    await hostPage.goto(`${baseURL}/booking/${booking.uid}`);
    const refunds = hostPage.getByRole("region", { name: "Booking refunds", exact: true });
    await expect(refunds).toBeVisible();
    if (partial) await refunds.getByRole("spinbutton").fill("12.50");
    await refunds.getByRole("checkbox").check();
    const refunded = hostPage.waitForResponse(response => new URL(response.url()).pathname === `/api/booking-refund/${booking.uid}` && response.request().method() === "POST");
    await refunds.getByRole("button", { name: "Request refund", exact: true }).click();
    expect((await refunded).ok()).toBe(true);
    await expect(refunds.getByText(partial ? "Refund confirmed." : "Refund requested. Completion is not confirmed; check the payment before taking further action.", { exact: true })).toBeVisible();
    await expect(refunds.getByRole("button", { name: "Request refund", exact: true })).toBeDisabled();
  } finally { await host.close(); }
});

}
