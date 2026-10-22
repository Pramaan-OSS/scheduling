import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 45000,
  outputDir: "../../.runtime/browser-results",
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3107", headless: true, viewport: { width: 1142, height: 800 } },
});
