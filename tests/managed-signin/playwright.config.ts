import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: ".", testMatch: "*.spec.ts", workers: 1, timeout: 60000, reporter: "list", outputDir: "../../.scratch/managed-browser-results", use: { headless: true, baseURL: "http://localhost:3197" } });
