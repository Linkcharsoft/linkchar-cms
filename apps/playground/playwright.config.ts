import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')

// One shared local database: the suites run one at a time, in a fixed order.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: './e2e/support/global-setup.ts',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined }
  },
  projects: [
    {
      name: 'es',
      testIgnore: /english\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3100' }
    },
    {
      name: 'en',
      testMatch: /english\.spec\.ts/,
      dependencies: ['es'],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3101' }
    }
  ],
  // The English panel is a second build of the same app with NEXT_PUBLIC_CMS_PANEL_LOCALE=en.
  webServer: [
    {
      command: 'pnpm exec next start -p 3100',
      url: 'http://localhost:3100/dashboard/login',
      reuseExistingServer: !process.env.CI,
      env: { CMS_MOCK_BUILD_SECONDS: '3' }
    },
    {
      command: 'pnpm exec next start -p 3101',
      url: 'http://localhost:3101/dashboard/login',
      reuseExistingServer: !process.env.CI,
      env: { NEXT_DIST_DIR: '.next-en', CMS_MOCK_BUILD_SECONDS: '3' }
    }
  ]
})
