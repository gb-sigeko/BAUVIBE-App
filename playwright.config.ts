import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3005",
    trace: "on-first-retry",
    actionTimeout: 20_000,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /phase10-security\.spec\.ts/],
    },
    {
      name: "chromium-extern",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /phase10-security\.spec\.ts/,
    },
  ],
  webServer: {
    command:
      process.env.PW_USE_EXISTING_BUILD === "1"
        ? "npx next start -p 3005"
        : "npm run build && npx next start -p 3005",
    url: "http://localhost:3005",
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      ...process.env,
      // Muss zum Playwright-Port passen, sonst schlagen Callback/CSRF und Cookies fehl.
      NEXTAUTH_URL: "http://localhost:3005",
      EMAIL_MOCK: "1",
      // `prebuild`/`check-env` soll den E2E-Webserver nicht blockieren (DB kommt aus TEST_DATABASE_URL im Job).
      SKIP_REQUIRED_ENV_CHECK: "1",
    },
  },
});
