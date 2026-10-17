import { defineConfig } from "@playwright/test";

const remote = process.env.SITE_TEST_URL;

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  use: {
    baseURL: remote ?? "http://127.0.0.1:4322",
    browserName: "chromium",
    channel: process.env.CI ? undefined : "chrome",
  },
  webServer: remote
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 4322",
        url: "http://127.0.0.1:4322/en/",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
