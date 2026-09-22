import { defineConfig } from "@playwright/test"
import { layout28TestConfig } from "./tests/support/layout28TestConfig"

const appUrl = "http://127.0.0.1:3321"
const { database } = layout28TestConfig

export default defineConfig( {
  testDir: "./tests/e2e",
  testMatch: "layout28-import-db.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: { baseURL: appUrl, trace: "retain-on-failure" },
  webServer: {
    command: "node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 3321",
    url: appUrl,
    reuseExistingServer: false,
    timeout: 240_000,
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
