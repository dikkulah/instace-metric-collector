import { test, expect } from '@playwright/test'
import { liveIndicator, waitForMetrics, selectLastProcessRow } from '../fixtures/helpers'

test.describe('Processes master-detail', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop only')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/processes')
    await waitForMetrics(page)
  })

  test('bottom row selection keeps detail in viewport', async ({ page }) => {
    await selectLastProcessRow(page)
    const detailHeading = page.getByRole('heading', { name: 'Process details', level: 2 })
    await expect(detailHeading).toBeVisible()
    await expect(detailHeading).toBeInViewport()
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBeLessThan(10)
  })

  test('split layout screenshot', async ({ page }) => {
    await selectLastProcessRow(page)
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('processes-split.png', {
      mask: [liveIndicator(page)],
      maxDiffPixelRatio: 0.03,
    })
  })
})
