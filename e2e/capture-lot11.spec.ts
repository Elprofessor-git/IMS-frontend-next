import { test, expect, type Page } from '@playwright/test'

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 120_000 })
}

async function shot(page: Page, path: string, name: string, waitFor: RegExp | string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.getByText(waitFor).first().waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `e2e/${name}.png`, fullPage: true })
}

test('LOT 11 — captures AVANT', async ({ page }) => {
  page.setViewportSize({ width: 1440, height: 900 })
  await login(page)

  await shot(page, '/coupe', 'lot11-avant-dashboard-1440', /Module Coupe/)
  // Onglet « Ordre de coupe » de la page globale
  const tabOrdre = page.getByRole('tab', { name: /Ordre de coupe/ })
  if (await tabOrdre.count()) {
    await tabOrdre.click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'e2e/lot11-avant-dashboard-ordre-1440.png', fullPage: true })
  }

  // Onglet « Matelas » de la page globale
  const tabMatelas = page.getByRole('tab', { name: /^Matelas$/ })
  if (await tabMatelas.count()) {
    await tabMatelas.click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'e2e/lot11-avant-dashboard-matelas-1440.png', fullPage: true })
  }

  // Page /coupe/{id} : les 3 onglets actuels
  await shot(page, '/coupe/64', 'lot11-avant-coupe-rapport-1440', /Module Coupe/)
  const t1 = page.getByRole('tab', { name: /Plan de coupe/ })
  if (await t1.count()) {
    await t1.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'e2e/lot11-avant-coupe-plan-1440.png', fullPage: true })
  }
  const t2 = page.getByRole('tab', { name: /Ordre de coupe/ })
  if (await t2.count()) {
    await t2.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'e2e/lot11-avant-coupe-ordre-1440.png', fullPage: true })
  }

  page.setViewportSize({ width: 375, height: 800 })
  await shot(page, '/coupe', 'lot11-avant-dashboard-375', /Module Coupe/)
  await shot(page, '/coupe/64', 'lot11-avant-coupe-375', /Module Coupe/)

  expect(true).toBe(true)
})
