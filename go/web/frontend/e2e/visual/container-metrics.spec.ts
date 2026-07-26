import { test, expect } from '@playwright/test'
import { liveIndicator, waitForMetrics } from '../fixtures/helpers'

const AGENT_CONTAINER_ID = 'abc123def456'

test.describe('Container metrics', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop only')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/container-metrics?id=${AGENT_CONTAINER_ID}&tab=overview`)
    await waitForMetrics(page)
  })

  test('overview shows agent hero and metrics', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'instace-metric-collector-metrics-collector-1', level: 1 })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByText('CPU', { exact: true }).first()).toBeVisible()
  })

  test('processes tab uses split layout', async ({ page }) => {
    await page.getByRole('button', { name: 'Processes', exact: true }).click()
    await waitForMetrics(page)
    const rows = page.locator('tbody tr')
    await rows.last().click()
    const detail = page.getByRole('heading', { name: 'Process details', level: 2 })
    await expect(detail).toBeInViewport()
  })

  test('overview screenshot', async ({ page }) => {
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('container-metrics-overview.png', {
      mask: [liveIndicator(page)],
      maxDiffPixelRatio: 0.03,
    })
  })
})
