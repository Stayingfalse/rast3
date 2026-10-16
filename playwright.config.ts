import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a deployed environment (dev by default):
 *
 *   E2E_BASE_URL=https://dev.raosanta.uk \
 *   E2E_TEST_LOGIN_SECRET=... \
 *   npx playwright test
 *
 * Signed-in tests need the dev-only test login (src/app/api/test-auth) and
 * are skipped when E2E_TEST_LOGIN_SECRET is not set. Never point these tests
 * at production.
 */
const baseURL = process.env.E2E_BASE_URL ?? "https://dev.raosanta.uk";

// Route browser traffic through an HTTPS proxy when the environment has one.
const proxyServer = process.env.HTTPS_PROXY ?? process.env.https_proxy;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/artifacts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "test-results/report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(proxyServer ? { proxy: { server: proxyServer } } : {}),
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
