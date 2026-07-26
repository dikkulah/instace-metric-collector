import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')
const agentBin = path.join(repoRoot, 'go/bin/agent')
const visualPort = process.env.VISUAL_PORT ?? '18081'
const baseURL = `http://127.0.0.1:${visualPort}`

export default defineConfig({
  testDir: './e2e/visual',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'en-US',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: [
      `cd "${repoRoot}" && make -C go build`,
      `DEMO_MODE=true METRICS_UI_ENABLED=true DOCKER_ENABLED=false METRICS_COLLECTION_INTERVAL=5000 SERVER_PORT=${visualPort} "${agentBin}"`,
    ].join(' && '),
    url: `${baseURL}/api/meta`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
