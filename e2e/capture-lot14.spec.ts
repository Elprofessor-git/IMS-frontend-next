import { test, expect, type Page } from '@playwright/test'

/**
 * Captures avant/après du LOT 14 (modules Production et Qualité).
 * PHASE=avant → l'état d'avant LOT 14 : /production n'existait pas comme dashboard
 *                (page hors périmètre) et /qualite ne listait que les triplets having
 *                un LotExport via l'ancien Board.
 * PHASE=apres → les deux dashboards complets, à 1440 px et 375 px.
 *
 * Le spec ne fait aucune assertion métier : il sert uniquement à produire les captures.
 */

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'
const PHASE = process.env.L14_PHASE === 'avant' ? 'avant' : 'apres'

async function api(page: Page, path: string, method = 'GET', body?: unknown) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const res = await fetch(`/api/proxy${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      let data: unknown = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = text
      }
      return { status: res.status, data }
    },
    { path, method, body },
  )
}

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 120_000 })
}

async function gotoPage(page: Page, path: string, waitFor: RegExp) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => {})
    try {
      await page.getByText(waitFor).first().waitFor({ state: 'visible', timeout: 30_000 })
      return
    } catch {
      /* premier chargement avorté : nouvelle tentative */
    }
  }
  throw new Error(`Page ${path} introuvable (attendu ${waitFor})`)
}

for (const width of [1440, 375]) {
  test(`captures ${PHASE} — ${width}px`, async ({ page }) => {
    page.setViewportSize({ width, height: width === 1440 ? 900 : 800 })
    await login(page)

    // ── Production ────────────────────────────────────────────────────────────
    if (PHASE === 'avant') {
      // Avant LOT 14 : aucune page /production (le module n'existait pas).
      await page.goto('/production', { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(3000)
      await page.screenshot({
        path: `e2e/lot14-${PHASE}-production-${width}.png`,
        fullPage: true,
      })
    } else {
      await gotoPage(page, '/production', /Avancement de la production/)
      await page.screenshot({
        path: `e2e/lot14-${PHASE}-production-${width}.png`,
        fullPage: true,
      })

      // Point d'entrée : création d'étape / d'OF en moins de 3 clics.
      await page.getByRole('button', { name: 'Planifier les étapes' }).click()
      await page.waitForTimeout(1200)
      await page.screenshot({
        path: `e2e/lot14-${PHASE}-production-entree-${width}.png`,
        fullPage: true,
      })
      await page.keyboard.press('Escape')
    }

    // ── Qualité ───────────────────────────────────────────────────────────────
    if (PHASE === 'avant') {
      // Avant LOT 14 : /qualite ne listait que les triplets avec LotExport (Board).
      await page.goto('/qualite', { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(4000)
      await page.screenshot({
        path: `e2e/lot14-${PHASE}-qualite-${width}.png`,
        fullPage: true,
      })
    } else {
      await gotoPage(page, '/qualite', /Contrôle qualité/)
      await page.screenshot({
        path: `e2e/lot14-${PHASE}-qualite-${width}.png`,
        fullPage: true,
      })

      // Dashboard complet : toutes les commandes actives, y compris sans export.
      const dto = (await api(page, '/api/Qualite/Dashboard')).data as {
        nombreCommandesActives: number
        commandesSansControle: number
        lignes: Array<{ commandeId: number; estCommandeSansExport: boolean }>
      }
      const commandesCouvertes = new Set(dto.lignes.map((l) => l.commandeId))
      expect(commandesCouvertes.size).toBe(dto.nombreCommandesActives)
      console.log(
        `capture ${PHASE} ${width}px : Qualité — ${dto.nombreCommandesActives} commandes actives ` +
          `(${dto.commandesSansControle} sans contrôle), couverture ${commandesCouvertes.size}/${dto.nombreCommandesActives}`,
      )
    }

    // ── Preuve de couverture (données) ─────────────────────────────────────────
    if (PHASE === 'apres') {
      const prod = (await api(page, '/api/Production/Dashboard')).data as { nombreCommandes: number }
      console.log(`capture ${PHASE} ${width}px : Production — ${prod.nombreCommandes} commandes actives`)
    }
  })
}
