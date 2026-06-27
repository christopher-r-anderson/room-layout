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
    // Serve a production build via `vite preview` rather than the dev server.
    // The dev server's on-demand dependency optimizer can trigger full-page
    // reloads mid-test (more likely with workers sharing one server), which
    // intermittently restarts the app and resets startup state. A static preview
    // build has no optimizer or HMR, so those reloads cannot happen. The e2e
    // render-quality flag is build-time-inlined, so it is set for the build.
    command:
      'pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1 --port 4174 --strictPort',
    env: {
      // Enables test-only instrumentation (scene-state bridge, perf counters) in
      // the build; render quality is set independently below.
      VITE_E2E: 'true',
      VITE_E2E_RENDER_QUALITY: 'low',
    },
    url: 'http://127.0.0.1:4174',
    // CI always builds fresh; locally a developer can keep a preview server
    // running for fast iteration (restart it to pick up code changes).
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
