import type { Page, Locator } from '@playwright/test'

/** Regions that change every tick — mask in screenshots. */
export function liveIndicator(page: Page): Locator {
  return page.getByTestId('live-indicator')
}

export async function waitForMetrics(page: Page) {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Waiting for first metrics'),
    { timeout: 20_000 },
  )
}

export async function selectLastListService(page: Page) {
  await page.getByRole('button', { name: 'List', exact: true }).click()
  const rows = page.locator('button').filter({ has: page.locator('.mono') })
  await rows.last().click()
}

export async function selectLastProcessRow(page: Page) {
  const rows = page.locator('tbody tr')
  await rows.last().click()
}
