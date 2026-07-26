import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')
const hubBin = path.join(repoRoot, 'go/bin/hub')
const hubPort = process.env.HUB_E2E_PORT ?? '18082'
const baseURL = `http://127.0.0.1:${hubPort}`

export default defineConfig({
  testDir: './e2e/hub',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    locale: 'en-US',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: [
      `cd "${repoRoot}" && make -C go build`,
      `METRICS_UI_ENABLED=true METRICS_COLLECTION_INTERVAL=5000 SERVER_PORT=${hubPort} "${hubBin}"`,
    ].join(' && '),
    url: `${baseURL}/api/meta`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
