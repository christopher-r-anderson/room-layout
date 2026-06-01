import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : 6,
  timeout: isCI ? 300_000 : 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results/playwright',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 1440, height: 960 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 4174',
    env: {
      VITE_E2E_RENDER_QUALITY: 'low',
    },
    url: 'http://127.0.0.1:4174',
    // Always start a fresh server so low-quality e2e env flags are guaranteed.
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['e2e/perf/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'perf-chromium',
      testMatch: ['e2e/perf/**/*.spec.ts'],
      retries: 0,
      fullyParallel: false,
      workers: 1,
      outputDir: 'test-results/perf',
      use: {
        ...devices['Desktop Chrome'],
        trace: 'off',
        video: 'off',
      },
    },
  ],
})
