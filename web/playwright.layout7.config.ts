import { defineConfig, devices } from "@playwright/test"
import { layout7TestConfig } from "./tests/support/layout7TestConfig"

const appUrl = "http://127.0.0.1:3317"
const { database } = layout7TestConfig

export default defineConfig( {
  testDir: "./tests/e2e",
  testMatch: "layout7-import.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: appUrl,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // Start Nuxt directly so Playwright can terminate the server reliably on Windows.
    command: "node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 3317",
    url: appUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "test",
      SITE_URL: appUrl,
      MARIADB_HOST: database.host,
      MARIADB_PORT: String( database.port ),
      MARIADB_DATABASE: database.name,
      MARIADB_USER: database.user,
      MARIADB_PASSWORD: database.password,
    },
  },
} )
