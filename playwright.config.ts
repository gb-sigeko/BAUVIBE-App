import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local") });

const e2ePort = Number(process.env.PLAYWRIGHT_DEV_PORT ?? "3017");
const e2eOrigin = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "tests/automated/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_BASE_URL ?? e2eOrigin,
    trace: "off",
  },
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run dev -- -p ${e2ePort}`,
        url: e2eOrigin,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          ...process.env,
          NEXTAUTH_URL: e2eOrigin,
          AUTH_TRUST_HOST: "true",
          SKIP_PLANUNG_SYNC: "1",
          PLANUNG_PERF_LOAD_MS: process.env.PLANUNG_PERF_LOAD_MS ?? "90000",
        },
      },
});
