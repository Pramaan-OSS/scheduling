import { expect, test } from "@playwright/test";

import { IS_CONNECTED_LOGIN_ENABLED } from "../server/lib/constants";

test("shows the configured connected-account sign-in button", async ({ page }) => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!IS_CONNECTED_LOGIN_ENABLED, "Only runs when connected sign-in is configured.");

  await page.goto(`/auth/login`);

  await expect(page.locator(`[data-testid=connected]`)).toBeVisible();
});
