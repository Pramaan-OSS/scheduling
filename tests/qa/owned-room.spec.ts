import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(readFileSync(".scratch/qa/fixtures.json", "utf8"));
test("owned rooms expose private details only to the host and close on cancellation", async ({ page, browser, baseURL }) => {
  test.setTimeout(300000);
  await page.context().route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto(`/event-types/${fixture.eventId}`);
  const enabled = page.getByLabel("Create a meeting room for this event type", { exact: true }).filter({ visible: true });
  await expect(enabled).toBeEnabled(); await enabled.check();
  await page.getByLabel("Pasted fallback meeting link", { exact: true }).filter({ visible: true }).fill("https://meeting.example.test/fallback");
  await page.getByLabel("I approve creating and deleting one room per booking. Recording stays off. Private host links are shown only to the room owner.", { exact: true }).filter({ visible: true }).check();
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === `/api/event-room/${fixture.eventId}` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Save meeting preference", exact: true }).click(); expect((await saved).ok()).toBe(true);
  const guest = await browser.newContext({ timezoneId: "Europe/London", storageState: { cookies: [], origins: [] } });
  try {
    await guest.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    const guestPage = await guest.newPage();
    await guestPage.goto(`${baseURL}/${fixture.username}/qa-public`);
    await guestPage.getByRole("button", { name: /^\d{1,2}:\d{2}(am|pm)$/ }).first().click();
    await guestPage.locator('input[name="name"]').fill("QA meeting guest");
    await guestPage.locator('input[name="email"]').fill("meeting-guest@example.test");
    const created = guestPage.waitForResponse(response => new URL(response.url()).pathname === "/api/book/event" && response.request().method() === "POST");
    await guestPage.getByRole("button", { name: "Confirm", exact: true }).click();
    const creation = await created; expect(creation.ok()).toBe(true); const booking = await creation.json();
    await expect(guestPage).toHaveURL(new RegExp(`/booking/${booking.uid}`));
    await expect(guestPage.locator('a[href="https://meeting.example.test/guest"]')).toBeVisible();
    expect(await guestPage.content()).not.toContain("https://meeting.example.test/private");
    const refused = await guest.request.get(`${baseURL}/api/meeting-room/${booking.uid}?host=true`); expect(refused.status()).toBe(403);
    await page.goto(`/booking/${booking.uid}`);
    const panel = page.getByRole("region", { name: "Meeting details", exact: true });
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Check meeting and recordings", exact: true }).click();
    await expect(panel.getByText("Recordings are not available yet.", { exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Open private host link", exact: true })).toBeVisible();
    const privateRead = await page.request.get(`/api/meeting-room/${booking.uid}?host=true`);
    expect(privateRead.headers()["cache-control"]).toContain("no-store");
    expect((await privateRead.json()).hostUrl).toBe("https://meeting.example.test/private");
    await guestPage.getByTestId("cancel").filter({ visible: true }).click();
    await guestPage.getByTestId("cancel_reason").filter({ visible: true }).fill("Disposable room check");
    const cancelled = guestPage.waitForResponse(response => new URL(response.url()).pathname === "/api/cancel" && response.request().method() === "POST");
    await guestPage.getByTestId("confirm_cancel").filter({ visible: true }).click(); expect((await cancelled).ok()).toBe(true);
    const row = await page.request.get(`/api/meeting-room/${booking.uid}`);
    expect((await row.json()).message).toBe("Meeting room closed.");
  } finally {
    await guest.close();
    await page.request.post(`/api/event-room/${fixture.eventId}`, { headers: { origin: baseURL! }, data: { enabled: false, fallbackUrl: "https://meeting.example.test/fallback", approved: true } });
  }
});
