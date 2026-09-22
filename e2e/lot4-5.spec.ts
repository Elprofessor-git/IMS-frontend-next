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
  // Retry : tant que la page n'est pas hydratée, le clic déclenche une soumission
  // native du <form> (URL /login?email=…&password=…) au lieu de l'appel fetch.
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto('/login')
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    try {
      await page.waitForURL('**/dashboard', { timeout: 45_000 })
      return
    } catch {
      // soumission native non hydratée → on recommence
    }
  }
  throw new Error(`Login impossible pour ${email}`)
}

async function gotoPage(page: Page, path: string, waitFor: RegExp | string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => {})
    const sel = page.getByText(waitFor)
    try {
      await sel.first().waitFor({ state: 'visible', timeout: 45_000 })
      return
    } catch {
      // premier chargement (compilation Next) avorté : nouvelle tentative
    }
  }
  throw new Error(`Page ${path} introuvable (attendu ${waitFor})`)
}

// Données complètes pour LOT 4/5 :
// tailles M100/L50 → 150 pièces · BOM 0,5 pièce → besoin brut 75 · marge 10 % → besoinFinal 82,5
// prix historique 10 EUR × 75 × taux 3,4 → coût matière 2550 TND · façon 2,5×150×3,4 → 1275 TND
async function creerDonnees(page: Page) {
  const ts = Date.now()

  const c = await api(page, '/api/Client', 'POST', {
    nom: `L45 Client ${ts}`,
    email: `l45-${ts}@example.com`,
    plateformeId: 1,
    estActif: true,
  })
  expect(c.status).toBe(201)
  const clientId = (c.data as { id: number }).id

  const cmd = await api(page, '/api/CommandeClient', 'POST', {
    clientId,
    devise: 'EUR',
    prixFacon: 2.5,
    modePilotage: 0,
  })
  expect(cmd.status).toBe(201)
  const commandeId = (cmd.data as { id: number }).id
  const numeroCommande = (cmd.data as { numeroCommande: string }).numeroCommande

  const tailles = await api(page, `/api/CommandeClient/${commandeId}/Tailles`, 'POST', [
    { taille: 'M', quantite: 100 },
    { taille: 'L', quantite: 50 },
  ])
  expect(tailles.status).toBe(200)

  const ar = await api(page, '/api/Article', 'POST', {
    designation: `Tissu L45 ${ts}`,
    reference: `L45-FAB-${ts}`,
    unite: 'm',
  })
  expect(ar.status).toBe(201)
  const articleId = (ar.data as { id: number }).id

  await api(page, '/api/TauxChange', 'POST', {
    deviseCode: 'EUR',
    dateEffective: new Date().toISOString().slice(0, 10),
    taux: 3.4,
  })

  const prix = await api(page, `/api/Article/${articleId}/PrixUnitaire`, 'PUT', {
    prixUnitaire: 10,
    devise: 'EUR',
  })
  expect(prix.status).toBe(200)

  const bom = await api(page, `/api/CommandeClient/${commandeId}/Bom`, 'POST', [
    { articleId, quantiteParPiece: 0.5 },
  ])
  expect(bom.status).toBe(200)

  const bes = await api(page, `/api/CommandeClient/${commandeId}/GenererBesoinsDepuisBom`, 'POST')
  expect(bes.status).toBe(200)

  const calc = await api(page, `/api/CommandeClient/${commandeId}/Calculer`, 'POST', {
    margeAppliquee: 10,
  })
  expect(calc.status).toBe(200)

  const mat = await api(page, '/api/Matelas', 'POST', {
    commandeId,
    numeroMatelas: `L45-MAT-${ts}`,
    dateMatelas: new Date().toISOString().slice(0, 10),
    piecePliage: 35,
    coupeEstimee: 35,
  })
  expect(mat.status).toBe(201)

  return { commandeId, numeroCommande, ts }
}

function money(re: string) {
  // fr-FR sépare les milliers par une espace insécable étroite (U+202F) — regex tolérante.
  return new RegExp(`${re}[\\s\\u202F\\u00A0]*`)
}

test.describe('LOT 4 + LOT 5 — runtime', () => {
  test('LOT 4-A + LOT 5-A standard + LOT 5-B absence coûtage — page commande', async ({ page }) => {
    test.setTimeout(300_000)
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId } = await creerDonnees(page)

    // Aucun appel /Coutage depuis la page commande (LOT 5-B : écran migré en Facturation).
    const coutageCalls: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/Coutage')) coutageCalls.push(r.url())
    })

    await gotoPage(page, `/commandes/${commandeId}`, /Informations/)

    // LOT 5-A (mode Standard) : UN onglet fusionné, plus d'onglets séparés OF / Tailles & BOM / Coûtage.
    const tabs = page.getByRole('tab')
    await expect(tabs.filter({ hasText: 'OF · Tailles & BOM' })).toBeVisible()
    await expect(tabs.filter({ hasText: /Tailles & BOM/ })).toHaveCount(1)
    await expect(tabs.filter({ hasText: 'Ordres de fabrication' })).toHaveCount(0)
    await expect(tabs.filter({ hasText: 'Coûtage' })).toHaveCount(0)

    await page.getByRole('tab', { name: /Besoins & Ressources/ }).click()

    // LOT 4-A : colonne « Besoin final » = Qté totale × (1 + marge / 100), manque recalculé.
    await expect(page.getByText('Besoin final', { exact: true })).toBeVisible()
    await expect(page.getByText('+ 10%', { exact: true })).toBeVisible()
    await expect(page.getByText('82,5', { exact: true }).first()).toBeVisible()
    await expect(
      page.getByText(/OF · Tailles & BOM → Calculer/),
    ).toBeVisible()

    expect(coutageCalls).toEqual([])
    await page.screenshot({ path: 'e2e/lot4-besoins-1440.png', fullPage: false })
  })

  test('LOT 5-A standard — création OF (UI) + bascule des tailles en lecture seule (invalidation)', async ({ page }) => {
    test.setTimeout(300_000)
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId, ts } = await creerDonnees(page)
    const numeroOF = `OF-L45-${ts}`

    await gotoPage(page, `/commandes/${commandeId}`, /Informations/)
    await page.getByRole('tab', { name: /OF · Tailles & BOM/ }).click()

    await expect(page.getByText('Aucun ordre de fabrication. Créez le premier pour répartir la production par taille.')).toBeVisible()

    // Création d'un OF via l'UI → mutations react-query qui invalident ['ordres-fabrication'] + ['commandes'].
    await page.getByRole('button', { name: 'Nouvel OF' }).click()
    const dialog = page.getByRole('dialog', { name: /Nouvel ordre de fabrication/ })
    await dialog.waitFor({ state: 'visible' })
    await dialog.getByPlaceholder('ex. OF-2026-001').fill(numeroOF)
    await dialog.getByRole('button', { name: 'Enregistrer' }).click()

    await expect(page.getByText('Ordre de fabrication créé')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('tr').filter({ hasText: numeroOF })).toBeVisible()
    // L'onglet fusionné repasse les tailles en lecture seule (données rafraîchies sans rechargement).
    await expect(page.getByText(/La répartition se pilote désormais par les OF/)).toBeVisible({ timeout: 20_000 })

    // Répartition du nouvel OF (M200) → 1 ligne taille sur l'OF.
    await page.locator('tr').filter({ hasText: numeroOF }).getByTitle('Gérer').click()
    const repart = page.getByRole('dialog').filter({ hasText: 'Répartition par taille' })
    await repart.waitFor({ state: 'visible', timeout: 20_000 })
    await repart.getByRole('button', { name: 'Ligne', exact: true }).click()
    await repart.locator('input[placeholder="ex. M"]').first().fill('M')
    await repart.locator('input[type="number"]').first().fill('200')
    await repart.getByRole('button', { name: /Enregistrer la répartition/ }).click()
    await expect(page.getByText('Répartition enregistrée')).toBeVisible({ timeout: 20_000 })

    await expect(page.locator('tr').filter({ hasText: numeroOF }).getByText('1', { exact: true }).first()).toBeVisible()
    await page.screenshot({ path: 'e2e/lot5-of-fusion-1440.png', fullPage: false })
  })

  test('LOT 5-A mode sous-traitance (modePilotage=1) — Fournitures en flux principal, pas d interface fusionnée', async ({ page }) => {
    test.setTimeout(300_000)
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId } = await creerDonnees(page)

    const mod = await api(page, `/api/CommandeClient/${commandeId}`, 'PUT', { modePilotage: 1 })
    expect(mod.status).toBe(204)

    await gotoPage(page, `/commandes/${commandeId}`, /Informations/)

    const fournitures = page.getByRole('tab', { name: /Fournitures/ })
    await expect(fournitures).toBeVisible()
    await expect(page.getByRole('tab', { name: /OF · Tailles & BOM/ })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /Coûtage/ })).toHaveCount(0)

    // « Besoins & Ressources » n'est pas accessible : le clic bascule automatiquement sur Fournitures.
    await page.getByRole('tab', { name: /Besoins & Ressources/ }).click()
    await expect(page.getByText('Nomenclature fournitures (pièces coupées)')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: 'e2e/lot5-soustraitance-1440.png', fullPage: false })

    const r = await api(page, `/api/CommandeClient/${commandeId}`, 'PUT', { modePilotage: 0 })
    expect(r.status).toBe(204)
  })

  test('LOT 4-B — /coupe/[commandeId] en onglets Rapport de coupe + Ordre de coupe (planning par matelas)', async ({ page }) => {
    test.setTimeout(300_000)
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId, ts } = await creerDonnees(page)
    const numero = `L45-MAT-${ts}`

    await gotoPage(page, `/coupe/${commandeId}`, /Module Coupe/)

    await expect(page.getByRole('tab', { name: /Rapport de coupe/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Ordre de coupe/ })).toBeVisible()

    await page.getByRole('tab', { name: /Ordre de coupe/ }).click()
    await expect(page.getByText('N° matelas', { exact: true })).toBeVisible()
    const row = page.locator('tr').filter({ hasText: numero })
    await expect(row).toBeVisible()
    await expect(row.getByText('35', { exact: true }).first()).toBeVisible()
    await expect(row.getByText('Aucune coupe')).toBeVisible()
    await expect(page.getByText('130', { exact: true })).not.toBeVisible()

    // Le rapport (onglet par défaut) reste disponible.
    await page.getByRole('tab', { name: /Rapport de coupe/ }).click()
    await expect(page.getByText(/Enregistrer une coupe/)).toBeVisible({ timeout: 45_000 })
    await page.screenshot({ path: 'e2e/lot4-ordre-coupe-1440.png', fullPage: false })
  })

  test('LOT 5-B — Coûtage désormais dans la Facturation, montants convertis en TND (desktop 1440)', async ({ page }) => {
    test.setTimeout(300_000)
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId, numeroCommande } = await creerDonnees(page)

    await gotoPage(page, '/factures', /Facturation/)
    await page.getByRole('tab', { name: /Coûtage/ }).click()
    await expect(page.getByText('Coût par style (matière + façon)')).toBeVisible()

await page.getByRole('combobox').click()
    await page.getByRole('option', { name: numeroCommande }).click()

    // Les montants « …550,00 TND » apparaissent en carte ET en cellule tableau → .first()
    await expect(page.getByText(money('550,00 TND')).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(money('275,00 TND')).first()).toBeVisible()
    await expect(page.getByText(money('825,00 TND')).first()).toBeVisible()
    await expect(page.getByText('150', { exact: true }).first()).toBeVisible()
    // Taux TND par ligne : 10 EUR × 75 × 3,4 → 2550 TND (colonne « Taux TND »).
    await expect(page.getByText('3,4', { exact: true }).first()).toBeVisible()
    await page.screenshot({ path: 'e2e/lot5-coutage-1440.png', fullPage: false })

    // La page commande ne contient plus l'écran Coûtage.
    await gotoPage(page, `/commandes/${commandeId}`, /CMD/)
    await expect(page.getByRole('tab', { name: /Informations/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Coûtage/ })).toHaveCount(0)
  })

  test('LOT 5-B — Coûtage responsive mobile 375px (montants TND affichés)', async ({ page }) => {
    test.setTimeout(300_000)
    page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    const { numeroCommande } = await creerDonnees(page)

    await gotoPage(page, '/factures', /Facturation/)
    await page.getByRole('tab', { name: /Coûtage/ }).click()
    await expect(page.getByText('Coût par style (matière + façon)')).toBeVisible()

    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: numeroCommande }).click()

    await expect(page.getByText(money('550,00 TND')).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(money('825,00 TND')).first()).toBeVisible()
    await page.screenshot({ path: 'e2e/lot5-coutage-375.png', fullPage: false })
  })
})

test.afterEach(async ({ request }) => {
  await setRole2(request, withFlags())
})