import { test } from '@playwright/test'

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'

// Pré-chauffage : force la compilation par le dev server Next.js de toutes les
// routes visitées par la suite, afin que les specs ne subissent pas les stalls
// de première compilation (initial compilation ~5-9s / route sous charge).
test('warm-up — compilation de toutes les routes du module', async ({ page }) => {
  test.setTimeout(300_000)
  const routes = [
    '/login',
    '/dashboard',
    '/commandes',
    '/commandes/1',
    '/coupe',
    '/coupe/1',
    '/planning',
    '/factures',
    '/taches',
    '/machines',
    '/stock',
    '/mouvements',
    '/achats',
    '/importations',
    '/articles',
  ]

  await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => {})
  const fill = async (sel: string, val: string) => {
    for (let i = 0; i < 20; i++) {
      const ok = await page.locator(sel).count()
      if (ok > 0) break
      await page.waitForTimeout(1000)
    }
    await page.fill(sel, val)
  }
  await fill('#email', EMAIL)
  await fill('#password', PASSWORD)
  await page.click('button[type="submit"]').catch(() => {})
  for (let i = 0; i < 60; i++) {
    if (page.url().includes('/dashboard')) break
    await page.waitForTimeout(1000)
  }

  for (const route of routes) {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(1500)
  }
})