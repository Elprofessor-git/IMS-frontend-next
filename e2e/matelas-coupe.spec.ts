import { test, expect, type Page } from '@playwright/test'

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'

type ApiResult = { status: number; data: unknown }

/**
 * Appel backend via le proxy Next.js : même origine que la page,
 * donc le cookie de session httpOnly est transmis automatiquement.
 */
async function api(page: Page, path: string, method = 'GET', body?: unknown): Promise<ApiResult> {
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

async function gotoCommandeTab(page: Page, commandeId: number, tab: RegExp) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page
      .goto(`/commandes/${commandeId}`, { waitUntil: 'domcontentloaded' })
      .catch(() => {})
    const onglet = page.getByRole('tab', { name: tab })
    try {
      await onglet.waitFor({ state: 'visible', timeout: 30_000 })
      await onglet.click()
      return
    } catch {
      // première chargement avorté (dev server qui compile) : nouvelle tentative
    }
  }
  throw new Error(
    `Impossible d'ouvrir l'onglet ${tab} sur /commandes/${commandeId}`,
  )
}

test('matelas + coupe + export : les 3 évolutions frontend', async ({ page }) => {
  const ts = Date.now()

  await login(page)

  // ── Données de base via API (temps de test écourté) ──
  // Client ⇒ PlateformeId (FK obligatoire) : créer une plateforme d'abord
  const plateformeRes = await api(page, '/api/Plateforme', 'POST', {
    nom: `PW Plateforme ${ts}`,
  })
  expect(plateformeRes.status).toBe(201)
  const plateformeId = (plateformeRes.data as { id: number }).id

  const clientRes = await api(page, '/api/Client', 'POST', {
    nom: `PW Client ${ts}`,
    prenom: null,
    nomEntreprise: null,
    email: `pw-${ts}@example.com`,
    telephone: null,
    adresse: null,
    ville: null,
    codePostal: null,
    pays: null,
    plateformeId,
    estActif: true,
  })
  expect(clientRes.status).toBe(201)
  const clientId = (clientRes.data as { id: number }).id

  const commandeRes = await api(page, '/api/CommandeClient', 'POST', { clientId })
  expect(commandeRes.status).toBe(201)
  const commandeId = (commandeRes.data as { id: number }).id

  const taillesRes = await api(page, `/api/CommandeClient/${commandeId}/Tailles`, 'POST', [
    { taille: 'M', quantite: 100 },
    { taille: 'L', quantite: 50 },
  ])
  expect(taillesRes.status).toBe(200)

  const chaineRes = await api(page, '/api/ChaineProduction', 'POST', {
    nom: `PW Chaine ${ts}`,
    typeChaine: 'Confection',
  })
  expect(chaineRes.status).toBe(200)
  const chaineId = (chaineRes.data as { id: number }).id

  // ── 1. Onglet Tailles : éditable tant qu'aucun OF ──
  await gotoCommandeTab(page, commandeId, /Tailles & BOM/)
  const taillesCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText('Configuration des tailles') })

  await expect(taillesCard.getByRole('button', { name: 'Modifier' })).toBeVisible()

  // Création d'un OF → la config des tailles doit passer en lecture seule
  const ofRes = await api(page, '/api/OrdreFabrication', 'POST', {
    commandeId,
    numeroOF: `OF-PW-${ts}`,
  })
  expect(ofRes.status).toBe(200)

  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.getByRole('tab', { name: /Tailles & BOM/ }).waitFor({ state: 'visible', timeout: 30_000 })
  await page.getByRole('tab', { name: /Tailles & BOM/ }).click()

  await expect(taillesCard.getByRole('button', { name: 'Modifier' })).toBeHidden()
  await expect(
    page.getByText(/Lecture seule : des ordres de fabrication existent/),
  ).toBeVisible()

  // ── 2 + 3. Rapport de coupe : matelas à la volée + chaîne ──
  await gotoCommandeTab(page, commandeId, /Rapport de coupe/)

  const coupeForm = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText('Enregistrer une coupe') })

  // Création d'un matelas « à la volée » (POST /api/Matelas)
  const numeroMatelas = `M-PW-${ts}`
  await coupeForm.locator('button', { hasText: 'Nouveau' }).click()
  await coupeForm.getByPlaceholder('ex. M-2026-001').fill(numeroMatelas)
  await coupeForm.getByRole('button', { name: 'Créer', exact: true }).click()
  await expect(coupeForm.getByText(numeroMatelas)).toBeVisible()

  // Renseigner taille + quantité et valider la coupe, rattachée au matelas
  await coupeForm.getByRole('combobox').first().click()
  await page.getByRole('option', { name: 'M', exact: true }).click()
  await coupeForm.locator('input[type="number"]').first().fill('12')
  await coupeForm.getByRole('button', { name: "Valider la coupe" }).click()
  await expect(page.getByText('Coupe enregistrée')).toBeVisible()
  // L'historique affiche le n° de matelas rattaché
  await expect(page.getByText(new RegExp(`12 pièce\\(s\\) · ${numeroMatelas}`))).toBeVisible()

  // Export (atelier) : sélecteur de chaîne
  const exportForm = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText('Enregistrer un export') })

  await exportForm.getByRole('combobox').nth(1).click()
  await page.getByRole('option', { name: `PW Chaine ${ts}` }).click()
  await exportForm.getByRole('combobox').first().click()
  await page.getByRole('option', { name: 'M', exact: true }).click()
  await exportForm.locator('input[type="number"]').first().fill('5')
  await exportForm.getByRole('button', { name: "Valider l'export" }).click()
  await expect(page.getByText('Export enregistré')).toBeVisible()
  // L'historique des exports affiche la chaîne
  await expect(
    page.getByText(new RegExp(`5 pièce\\(s\\) · PW Chaine ${ts}`)),
  ).toBeVisible()

  console.log(`commandeId=${commandeId} clientId=${clientId} chaineId=${chaineId} matelas=${numeroMatelas}`)
})