import { test, expect, type Page } from '@playwright/test'

/**
 * Captures « AVANT » du LOT 14, prises sur le build de référence (a86669f)
 * servi sur le port 3100. Les captures « après » sont produites par
 * capture-lot14.spec.ts sur le build courant (port 3000).
 *
 * Le spec ne fait aucune assertion métier : il sert uniquement à produire les captures.
 */

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'
const BASE = 'http://localhost:3100'

async function login(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 120_000 })
}

for (const width of [1440, 375]) {
  test(`captures avant — ${width}px`, async ({ page }) => {
    page.setViewportSize({ width, height: width === 1440 ? 900 : 800 })
    await login(page)

    // ── Production : page inexistante avant LOT 14 ────────────────────────────
    await page.goto(`${BASE}/production`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.waitForTimeout(3000)
    await page.screenshot({ path: `e2e/lot14-avant-production-${width}.png`, fullPage: true })

    // ── Qualité : pas de dashboard, il faut choisir une commande ───────────────
    await page.goto(`${BASE}/qualite`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.waitForTimeout(4000)
    await page.screenshot({ path: `e2e/lot14-avant-qualite-${width}.png`, fullPage: true })

    console.log(`capture avant ${width}px : /production et /qualite du build de référence`)
    expect(page.url()).toContain('/qualite')
  })
}
