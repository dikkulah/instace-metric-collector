import { test, expect } from '@playwright/test'
import { liveIndicator, waitForMetrics } from '../fixtures/helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop only')
    await page.goto('/')
    await waitForMetrics(page)
  })

  test('renders summary cards and disk table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
    await expect(page.getByText('CPU').first()).toBeVisible()
    await expect(page.getByText('Memory').first()).toBeVisible()
    await expect(page.getByText('Disk', { exact: true }).first()).toBeVisible()
  })

  test('main content screenshot', async ({ page }) => {
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('dashboard-main.png', {
      mask: [liveIndicator(page)],
    })
  })
})
