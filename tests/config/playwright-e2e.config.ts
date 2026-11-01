import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    // E2E bootstrap: seed local D1 (idempotent, silent) and ensure a dummy master key exists
    // in .dev.vars — opennext reads bindings from there, not process.env, and without a key
    // every API hit logs a config error. Never overwrites a developer's real .dev.vars.
    // Seed output is captured and only printed on failure: quiet when green, diagnosable when not.
    command: `[ -f .dev.vars ] || printf 'MASTER_ENCRYPTION_KEY=e2e-test-key\\n' > .dev.vars;
      out=$(npx wrangler d1 execute time-seal-db --local -y --file=./schema.sql 2>&1) || { printf '%s\\n' "$out"; exit 1; };
      export NEXT_PUBLIC_IS_E2E=true;
      ${process.env.CI ? 'npm run build && npm start' : 'npm run dev'}`,
    // Default cwd is the config directory; relative paths need the repo root.
    cwd: process.cwd(),
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
  },
});
