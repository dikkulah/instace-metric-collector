import { test, expect } from '@playwright/test'
import { liveIndicator, waitForMetrics, selectLastListService } from '../fixtures/helpers'

test.describe('Services master-detail', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop only')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/services')
    await waitForMetrics(page)
  })

  test('bottom row selection keeps detail in viewport', async ({ page }) => {
    await selectLastListService(page)
    const detailHeading = page.getByRole('heading', { name: 'Service details', level: 2 })
    await expect(detailHeading).toBeVisible()
    await expect(detailHeading).toBeInViewport()
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBeLessThan(10)
  })

  test('split layout screenshot', async ({ page }) => {
    await selectLastListService(page)
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('services-split.png', {
      mask: [liveIndicator(page)],
      maxDiffPixelRatio: 0.03,
    })
  })
})
