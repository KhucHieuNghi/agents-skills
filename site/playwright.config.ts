import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  use: {
    baseURL: "http://127.0.0.1:4322",
    browserName: "chromium",
    channel: process.env.CI ? undefined : "chrome",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4322",
    url: "http://127.0.0.1:4322/en/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
