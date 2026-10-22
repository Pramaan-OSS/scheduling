import { expect, test } from "@playwright/test";

for (const method of ["email", "signup", "social", "refused"] as const) {
  test(`managed ${method} uses a verified local session`, async ({ context, page }) => {
    let checkedToken = false;
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return route.continue();
      if (url.hostname !== "signin.example.test") return route.abort();
      const headers = { "access-control-allow-origin": "http://localhost:3197", "access-control-allow-credentials": "true", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": route.request().headers()["access-control-request-headers"] || "content-type" };
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (url.pathname.endsWith("/token")) { checkedToken = true; return route.fulfill({ json: { token: method === "refused" ? "forged-token" : "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmaXh0dXJlX3VzZXIiLCJlbWFpbCI6Im1hbmFnZWRAZXhhbXBsZS50ZXN0IiwibmFtZSI6Ik1hbmFnZWQgRml4dHVyZSIsImVtYWlsVmVyaWZpZWQiOnRydWV9.fixture-signature" }, headers }); }
      if (url.pathname.endsWith("/sign-in/social")) {
        expect(route.request().postDataJSON().provider).toBe("google");
        return route.fulfill({ json: { redirect: true, url: "http://localhost:3197/auth/managed-callback" }, headers });
      }
      return route.fulfill({ json: { token: "opaque-session-cookie", user: { id: "fixture_user", email: "managed@example.test", name: "Managed Fixture", emailVerified: true }, session: { id: "fixture-session", userId: "fixture_user" } }, headers });
    });
    const response = await page.goto("/auth/login"); expect(response?.status()).toBe(200);
    const panel = page.getByRole("region", { name: "Managed sign-in", exact: true });
    // A named section is an accessible region; no outside page or real identity service is opened.
    await expect(panel).toBeVisible();
    if (method === "social") await panel.getByRole("button", { name: "Continue with social sign-in" }).click();
    else {
      if (method === "signup") { await panel.getByRole("button", { name: "Create an account", exact: true }).click(); await panel.getByLabel("Name", { exact: true }).fill("Managed Fixture"); }
      await panel.getByLabel("Email", { exact: true }).fill("managed@example.test");
      await panel.getByLabel("Password", { exact: true }).fill("Fixture-Managed-42!");
      await panel.getByRole("button", { name: method === "signup" ? "Create managed account" : "Sign in with email", exact: true }).click();
    }
    if (method === "refused") {
      await expect(panel.getByRole("alert")).toContainText("could not be completed");
      expect((await (await page.request.get("/api/auth/session")).json()).user).toBeUndefined();
    } else {
      await expect(page).not.toHaveURL(/auth\/login/);
      await expect.poll(async () => (await (await page.request.get("/api/auth/session")).json()).user?.email).toBe("managed@example.test");
    }
    expect(checkedToken).toBe(true);
    await expect(page.locator("body")).not.toContainText(/Traceback|fixture-managed-token|forged-token/);
  });
}
