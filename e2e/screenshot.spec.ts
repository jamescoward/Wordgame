import { test } from '@playwright/test'
import { mkdirSync } from 'fs'

test('capture game screenshot', async ({ page }) => {
  // iPhone 14 Pro dimensions
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.waitForSelector('[data-testid="letter-wheel"]')
  // Short pause for animations to settle
  await page.waitForTimeout(500)

  mkdirSync('screenshots', { recursive: true })
  await page.screenshot({ path: 'screenshots/game.png', fullPage: false })
})
