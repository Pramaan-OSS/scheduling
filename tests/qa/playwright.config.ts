import { defineConfig } from "@playwright/test";
const baseURL = process.env.QA_URL || "http://localhost:3198";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Use the disposable local QA stack.");
export default defineConfig({ testDir: ".", workers: 1, expect: { timeout: 20000 }, timeout: 180000, reporter: "list", outputDir: "../../.scratch/qa/browser-results", use: { headless: true, timezoneId: "Europe/London", actionTimeout: 15000, navigationTimeout: 180000, baseURL, storageState: process.env.QA_SESSION_PATH || ".scratch/qa/session.json", screenshot: "only-on-failure" } });
