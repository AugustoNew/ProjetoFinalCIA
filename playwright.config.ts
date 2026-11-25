import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";
const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://agendaki:agendaki_dev@localhost:5432/agendaki_e2e?schema=public";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "npm run e2e:prepare && npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      DIRECT_URL: e2eDatabaseUrl,
      E2E_DATABASE_URL: e2eDatabaseUrl,
      AUTH_SECRET: "playwright-test-secret-not-for-production",
      AUTH_URL: baseURL,
      APP_URL: baseURL,
      CRON_SECRET: "playwright-test-cron-secret",
    },
  },
});
