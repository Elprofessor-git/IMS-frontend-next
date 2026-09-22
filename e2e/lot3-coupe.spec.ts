import { test, expect, type Page } from '@playwright/test'
import { setRole2, withFlags } from './lot2-perms.helper'

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'

type ApiResult = { status: number; data: unknown }

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

async function login(page: Page, email = EMAIL, password = PASSWORD) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 120_000 })
}

async function gotoPage(page: Page, path: string, waitFor: RegExp | string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => {})
    const sel = page.getByText(waitFor)
    try {
      await sel.first().waitFor({ state: 'visible', timeout: 30_000 })
      return
    } catch {
      // premier chargement (compilation Next) avorté : nouvelle tentative
    }
  }
  throw new Error(`Page ${path} introuvable (attendu ${waitFor})`)
}

async function creerCommande(page: Page) {
  const ts = Date.now()
  const clientRes = await api(page, '/api/Client', 'POST', {
    nom: `L3 Client ${ts}`,
    prenom: null,
    nomEntreprise: null,
    email: `l3-${ts}@example.com`,
    telephone: null,
    adresse: null,
    ville: null,
    codePostal: null,
    pays: null,
    plateformeId: 1,
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

  return { commandeId, numeroCommande: (commandeRes.data as { numeroCommande: string }).numeroCommande, ts }
}

async function creerMatelasGlobal(page: Page, numero: string, commandeSelect: string | null) {
  await page.getByRole('button', { name: /Nouveau matelas/ }).click()
  const dialog = page.getByRole('dialog', { name: /Nouveau matelas/ })
  await dialog.waitFor({ state: 'visible' })
  await dialog.getByRole('combobox').first().click()
  if (commandeSelect) {
    await page.getByRole('option', { name: commandeSelect }).first().click()
  } else {
    await page.getByRole('option').first().click()
  }
  await dialog.getByPlaceholder('ex. M-2026-001').fill(numero)
  await dialog.locator('input[type="number"]').first().fill('35')
  await dialog.locator('input[type="number"]').nth(1).fill('35')
  await dialog.getByRole('button', { name: 'Créer', exact: true }).click()
  await expect(page.getByText('Matelas créé')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(numero, { exact: true }).first()).toBeVisible()
}

test.describe('LOT 3 — Module Coupe', () => {
  test('admin — 3 onglets, création matelas, KPI et ordre de coupe calculé', async ({ page }) => {
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { numeroCommande, ts } = await creerCommande(page)

    await gotoPage(page, '/coupe', /Module Coupe/)
    await expect(page.getByRole('tab', { name: /Matelas/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Pièces coupées/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Ordre de coupe/ })).toBeVisible()

    // Création via le dialog (numéro unique → pas de doublon en base)
    const numero = `L3-GLOBAL-${ts}`
    await creerMatelasGlobal(page, numero, numeroCommande)
    const row = page.locator('tr').filter({ has: page.getByText(numero, { exact: true }) })
    await expect(row.getByText(/^#\d+$/)).toBeVisible() // ordreDeCoupe calculé

    // KPI globaux (GET /api/Matelas/Stats)
    await page.getByRole('tab', { name: /Pièces coupées/ }).click()
    await expect(page.getByText('Pièces commandées').first()).toBeVisible()
    await expect(page.getByText('Pièces coupées').first()).toBeVisible()
    await expect(page.getByText('Répartition par commande')).toBeVisible()
    await expect(page.getByText(numeroCommande).first()).toBeVisible()

    // Ordre de coupe = vue calculée (séquence ascendante)
    await page.getByRole('tab', { name: /Ordre de coupe/ }).click()
    await expect(page.getByText(/séquence des matelas/)).toBeVisible()
    await expect(page.locator('tr').filter({ has: page.getByText(numero, { exact: true }) }).getByText(numero, { exact: true })).toBeVisible()

    // Un matelas rattaché : ouverture du détail coupe de la commande
    await page.getByRole('tab', { name: /Matelas/ }).click()
    await row.getByTitle('Gérer la coupe de cette commande').click()
    await expect(page.getByText(/Enregistrer une coupe/)).toBeVisible({ timeout: 45_000 })
    await page.screenshot({ path: 'e2e/lot3-coupe-onglets-1440.png', fullPage: false })
  })

  test('admin — matelas verrouillé (PUT/DELETE 409) dès qu une coupe existe', async ({ page }) => {
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId, numeroCommande, ts } = await creerCommande(page)
    const numero = `L3-PROT-${ts}`

    await gotoPage(page, '/coupe', /Module Coupe/)
    await creerMatelasGlobal(page, numero, numeroCommande)
    const row = page.locator('tr').filter({ has: page.getByText(numero, { exact: true }) })

    // Coupe rattachée au matelas (détail coupe de la commande)
    await gotoPage(page, `/coupe/${commandeId}`, /Module Coupe/)
    const coupeForm = page.locator('[data-slot="card"]').filter({ has: page.getByText('Enregistrer une coupe') })
    await coupeForm.getByRole('combobox').nth(1).click() // matelas
    await page.getByRole('option', { name: numero, exact: false }).first().click()
    await coupeForm.getByRole('combobox').first().click() // taille
    await page.getByRole('option', { name: 'M', exact: true }).click()
    await coupeForm.locator('input[type="number"]').first().fill('12')
    await coupeForm.getByRole('button', { name: 'Valider la coupe' }).click()
    await expect(page.getByText('Coupe enregistrée')).toBeVisible({ timeout: 15_000 })

    // DELETE → 409 « matelas qui a des coupes »
    await gotoPage(page, '/coupe', /Module Coupe/)
    const row2 = page.locator('tr').filter({ has: page.getByText(numero, { exact: true }) })
    await row2.getByTitle('Supprimer le matelas').click()
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(page.getByText(/Impossible de supprimer un matelas qui a des coupes enregistrées/)).toBeVisible({ timeout: 15_000 })

    // PUT → 409 également
    const row3 = page.locator('tr').filter({ has: page.getByText(numero, { exact: true }) })
    await row3.getByTitle('Modifier le matelas').click()
    const dialog = page.getByRole('dialog', { name: /Modifier le matelas/ })
    await dialog.locator('textarea').fill('tentative')
    await dialog.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText(/Impossible de modifier un matelas qui a des coupes enregistrées/)).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: 'e2e/lot3-coupe-verrouillage-1440.png', fullPage: false })

    // Historique conservé (le matelas n'a jamais été écrasé)
    await gotoPage(page, `/coupe/${commandeId}`, /Module Coupe/)
    await expect(page.getByText(/Suivi par taille/)).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText(new RegExp(`12 pièce\\(s\\) · ${numero}`))).toBeVisible({ timeout: 15_000 })
  })

  test('admin — édition d une coupe (PUT) + garde-fou dépassement 409', async ({ page }) => {
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId, numeroCommande, ts } = await creerCommande(page)
    const numero = `L3-ED-${ts}`

    await gotoPage(page, '/coupe', /Module Coupe/)
    await creerMatelasGlobal(page, numero, numeroCommande)

    await gotoPage(page, `/coupe/${commandeId}`, /Module Coupe/)
    const coupeForm = page.locator('[data-slot="card"]').filter({ has: page.getByText('Enregistrer une coupe') })
    await coupeForm.getByRole('combobox').nth(1).click()
    await page.getByRole('option', { name: numero, exact: false }).first().click()
    await coupeForm.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'M', exact: true }).click()
    await coupeForm.locator('input[type="number"]').first().fill('10')
    await coupeForm.getByRole('button', { name: 'Valider la coupe' }).click()
    await expect(page.getByText('Coupe enregistrée')).toBeVisible({ timeout: 15_000 })

    // PUT : 10 → 17
    const histCard = page.locator('[data-slot="card"]').filter({ has: page.getByText('Historique des coupes') })
    await histCard.getByTitle('Modifier la coupe').click()
    const dialog = page.getByRole('dialog', { name: /Modifier la coupe/ })
    await dialog.locator('input[type="number"]').first().fill('17')
    await dialog.locator('input:not([type="number"])').fill('corrigé')
    await dialog.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText('Coupe mise à jour')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(new RegExp(`17 pièce\\(s\\) · ${numero}`))).toBeVisible()

    // Garde-fou : dépassement (500 > seuil M=100) sans « forcer » → 409 conservé
    await histCard.getByTitle('Modifier la coupe').click()
    const dialog2 = page.getByRole('dialog', { name: /Modifier la coupe/ })
    await dialog2.locator('input[type="number"]').first().fill('500')
    await dialog2.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText(/Dépassement de coupe/)).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: 'e2e/lot3-coupe-edit-1440.png', fullPage: false })
  })

  test('non-admin sans droits coupe — /coupe renvoie l état Accès refusé', async ({ page }) => {
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page, 'nonadmin@test.com', 'NonAdmin123')
    await gotoPage(page, '/coupe', /Accès refusé/)
    await expect(page.getByText(/module « coupe » non autorisé/)).toBeVisible()
    await expect(page.getByRole('tab', { name: /Matelas/ })).toHaveCount(0)
    await page.screenshot({ path: 'e2e/lot3-coupe-nonadmin-1440.png', fullPage: false })
  })
})

test.afterEach(async ({ request }) => {
  await setRole2(request, withFlags())
})