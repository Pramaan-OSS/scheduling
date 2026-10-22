import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => { await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); });
test("administrator creates, searches, edits and deletes a local user", async ({ page }) => {
  const missingAvatars: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.endsWith("/avatar.png")) missingAvatars.push(request.url()); });
  const username = `qa-user-${Date.now()}`;
  const email = `${username}@example.test`;
  await page.goto("/settings/admin/users/add");
  await expect(page.getByLabel("Identity provider", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.locator("body")).toContainText("Local sign-in");
  await page.getByLabel("Name", { exact: true }).filter({ visible: true }).fill("QA ordinary user");
  await page.getByLabel("Username", { exact: true }).filter({ visible: true }).fill(username);
  await page.getByLabel("Email", { exact: true }).filter({ visible: true }).fill(email);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await page.getByPlaceholder("username or email").filter({ visible: true }).fill(email);
  const row = page.getByRole("row").filter({ hasText: email });
  await expect(row).toBeVisible();
  await row.getByRole("button").last().click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).filter({ visible: true }).fill("QA ordinary user edited");
  const saved = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname.includes("users/update"));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await page.goto("/settings/admin/users");
  await expect(row).toContainText("QA ordinary user edited");
  let releaseSearch!: () => void;
  let markSearchHeld!: () => void;
  const searchHeld = new Promise<void>(resolve => { markSearchHeld = resolve; });
  const release = new Promise<void>(resolve => { releaseSearch = resolve; });
  let holdNextSearch = true;
  let freshSearchStarted = false;
  await page.route("**/api/trpc/**", async route => {
    if (!new URL(route.request().url()).pathname.includes("listPaginated") || !decodeURIComponent(route.request().url()).includes(email)) return route.continue();
    if (!holdNextSearch) { freshSearchStarted = true; return route.continue(); }
    holdNextSearch = false;
    const response = await route.fetch();
    markSearchHeld();
    await release;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.getByPlaceholder("username or email").filter({ visible: true }).fill(email);
  await searchHeld;
  try {
  await expect(row).toContainText("QA ordinary user edited");
  await row.getByRole("button").last().click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const deleted = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname.includes("users/delete"));
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  expect((await deleted).ok()).toBe(true);
  await expect.poll(() => freshSearchStarted, { message: "Deletion must start a fresh filtered search instead of reusing the pending response." }).toBe(true);
  releaseSearch();
  await expect(row).toHaveCount(0);
  } finally { releaseSearch(); }
  expect(missingAvatars).toEqual([]);
});
