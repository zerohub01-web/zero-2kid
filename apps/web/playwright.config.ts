import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/qa-e2e.spec.ts"],
  testIgnore: ["**/unit/**", "**/admin.spec.ts", "**/full-e2e.spec.ts"],
  outputDir: "test-results/artifacts",
  timeout: 30000,
  retries: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/playwright.json" }],
    ["html", { outputFolder: "test-results/html", open: "never" }]
  ],
  use: {
    baseURL: process.env.WEB_URL || "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
