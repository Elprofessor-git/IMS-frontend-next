import { test, expect, type Page } from '@playwright/test'

/**
 * Captures avant/après du LOT 12 (entrée du module Coupe).
 * PHASE=avant → le dashboard d'avant LOT 12 (liste dérivée de /api/Matelas, aucun point
 *                d'entrée de création) ; l'état vide de /coupe/{id} est un simple texte.
 * PHASE=apres → le dashboard complet : bouton « Nouvel ordre de coupe », filtre,
 *                bouton « Planifier » par ligne, état vide avec CTA.
 * Le spec ne fait aucune assertion : il sert uniquement à produire les captures.
 */

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'
const PHASE = process.env.L12_PHASE === 'avant' ? 'avant' : 'apres'

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

async function creerCommandeNeuve(page: Page) {
  const ts = Date.now()
  const pf = await api(page, '/api/Plateforme', 'POST', { nom: `L12C Pf ${ts}` })
  const client = await api(page, '/api/Client', 'POST', {
    nom: `L12C Client ${ts}`,
    prenom: null,
    nomEntreprise: null,
    email: `l12c-${ts}@example.com`,
    telephone: null,
    adresse: null,
    ville: null,
    codePostal: null,
    pays: null,
    plateformeId: (pf.data as { id: number }).id,
    estActif: true,
  })
  const cmd = await api(page, '/api/CommandeClient', 'POST', {
    clientId: (client.data as { id: number }).id,
  })
  const c = cmd.data as { id: number; numeroCommande: string }
  await api(page, `/api/CommandeClient/${c.id}/Tailles`, 'POST', [
    { taille: 'M', quantite: 100 },
    { taille: 'L', quantite: 50 },
  ])
  return c
}

for (const width of [1440, 375]) {
  test(`captures ${PHASE} — ${width}px`, async ({ page }) => {
    page.setViewportSize({ width, height: width === 1440 ? 900 : 800 })
    await login(page)
    const commande = await creerCommandeNeuve(page)

    await gotoPage(page, '/coupe', /Module Coupe/)
    await page.screenshot({
      path: `e2e/lot12-entree-${PHASE}-dashboard-${width}.png`,
      fullPage: true,
    })

    await gotoPage(page, `/coupe/${commande.id}`, /Module Coupe/)
    await page.screenshot({
      path: `e2e/lot12-entree-${PHASE}-vide-${width}.png`,
      fullPage: true,
    })

    console.log(
      `capture ${PHASE} ${width}px : ${commande.numeroCommande} (id ${commande.id}) — tableau de bord + état vide`,
    )
    expect(commande.id).toBeGreaterThan(0)
  })
}
