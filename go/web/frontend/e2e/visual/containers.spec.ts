import { test, expect } from '@playwright/test'
import { liveIndicator, waitForMetrics } from '../fixtures/helpers'

test.describe('Containers desktop', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop only')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/containers')
    await waitForMetrics(page)
  })

  test('shows container list and detail', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Docker containers', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'instace-metric-collector-metrics-collector-1', level: 2 })).toBeVisible()
    await expect(page.getByRole('button', { name: /instace-metric-collector-metrics-collector-1/ })).toBeVisible()
  })

  test('layout screenshot', async ({ page }) => {
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('containers-desktop.png', {
      mask: [liveIndicator(page)],
      maxDiffPixelRatio: 0.03,
    })
  })
})

test.describe('Containers mobile', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile', 'mobile only')
  })

  test('list view fits mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/containers')
    await waitForMetrics(page)
    await expect(page.getByRole('heading', { name: 'Docker containers', level: 1 })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
})
