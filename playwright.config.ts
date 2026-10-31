import { defineConfig, devices } from "@playwright/test";

// E2E de flujos críticos. Corren contra el servidor de dev con la DB del seed:
//   npm run db:seed && npm run test:e2e
// Comparten la DB, así que van en serie (workers: 1). El login se hace una vez por rol en
// `auth.setup.ts` (el ingreso tiene límite de intentos por minuto) y se reusa la sesión.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "celular",
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
      testIgnore: /a11y\.spec/,
    },
    {
      name: "escritorio",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: /a11y\.spec/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/ingresar",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
