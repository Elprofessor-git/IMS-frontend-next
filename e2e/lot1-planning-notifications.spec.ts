import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

const BASE = 'http://localhost:3000'

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmt(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}/${iso.slice(0, 4)}`
}

async function login(page: Page, email: string, password: string) {
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(`${BASE}/login`)
      await page.fill('#email', email)
      await page.fill('#password', password)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard', { timeout: 45_000 })
      return
    } catch (err) {
      lastErr = err
      page.removeAllListeners('pageerror')
    }
  }
  throw lastErr
}

// Nettoyage BEST-EFFORT : supprime TOUTES les données de test laissées par des
// runs précédents. La base jetable ne contient que le seed (dates 2026) — donc
// toute date >= 2027 et toute cellule au numéro 79-PO-TEST-*/79-PO-CROSS-* est
// un reliquat de test. Idempotent — ne fait JAMAIS échouer le test en cas de
// 503 proxy (first hit).
const DATE_SEUIL_RELIQUAT = '2027-01-01'
async function cleanupTestData(request: APIRequestContext) {
  try {
    let token = ''
    for (let i = 0; i < 5 && !token; i++) {
      const r = await request.post(`${BASE}/api/proxy/api/Auth/login`, {
        data: { email: EMAIL_ADMIN, password: MDP_ADMIN },
      })
      if (r.ok()) token = ((await r.json()) as { token: string }).token
      else await new Promise((res) => setTimeout(res, 1500))
    }
    if (!token) return
    const auth = { Authorization: `Bearer ${token}` }

    const grille = (await (
      await request.get(`${BASE}/api/proxy/api/Planning`, { headers: auth })
    ).json()) as {
      dates: { id: number; date: string }[]
      cellules: { id: number; numeroCommande: string }[]
    }

    for (const d of grille.dates) {
      if (d.id && d.date.slice(0, 10) >= DATE_SEUIL_RELIQUAT) {
        await request.delete(`${BASE}/api/proxy/api/Planning/dates/${d.id}`, { headers: auth })
      }
    }
    for (const c of grille.cellules) {
      if (c.numeroCommande?.startsWith('79-PO-TEST-') || c.numeroCommande?.startsWith('79-PO-CROSS-')) {
        await request.delete(`${BASE}/api/proxy/api/Planning/${c.id}`, { headers: auth })
      }
    }
  } catch {
    // best effort — un échec de nettoyage (ex. proxy 503) ne bloque pas le test
  }
}

// Données uniques par run : aucune collision avec d'éventuels reliquats en base.
const jitter = Math.floor(Math.random() * 400)
const create = new Date()
create.setDate(create.getDate() + 400 + jitter)
const modify = new Date()
modify.setDate(create.getDate() + 7)
const DATE_CREATE = toIso(create)
const DATE_MODIFIE = toIso(modify)
const NUMERO_CELLULE = `79-PO-TEST-${Math.floor(Math.random() * 100000) + 1}`
const NUMERO_CROSS = `79-PO-CROSS-${Math.floor(Math.random() * 100000) + 1}`
const EMAIL_ADMIN = 'admin@gestiontextile.com'
const MDP_ADMIN = 'Admin123!'

test.describe('LOT 2 — planning transposé : chaînes = colonnes, dates = lignes', () => {
  test('ADMIN 1440px : grille transposée, nav par dates, CRUD lignes de dates + cellules, chaînes, cloche, F5', async ({
    page,
    request,
  }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await cleanupTestData(request)
    await login(page, EMAIL_ADMIN, MDP_ADMIN)

    // A : le module planning reste visible
    const planLink = page.getByRole('link', { name: 'Planning' })
    await expect(planLink).toBeVisible({ timeout: 20_000 })
    await planLink.click()
    await page.waitForURL('**/planning')

    // B : grille TRANSPOSÉE — la chaîne est une colonne (th), la date une ligne (th)
    await expect(page.locator('th').filter({ hasText: 'Chaine Test HTTP' })).toBeVisible({
      timeout: 25_000,
    })
    await expect(page.locator('th').filter({ hasText: '05/09/2026' })).toBeVisible({
      timeout: 25_000,
    })
    await expect(page.getByText('79-PO-TEST-001')).toBeVisible()

    // C : navigation par fenêtre de dates (11 dates seedées, fenêtre = 8)
    await page.getByRole('button', { name: /Dates suiv/i }).click()
    await expect(page.locator('th').filter({ hasText: '05/09/2026' })).toHaveCount(0, {
      timeout: 15_000,
    })
    await expect(page.locator('th').filter({ hasText: '31/10/2026' })).toBeVisible()
    await page.getByRole('button', { name: /Dates préc/i }).click()
    await expect(page.locator('th').filter({ hasText: '05/09/2026' })).toBeVisible({
      timeout: 15_000,
    })

    // C : aller-à-une-date cible la dernière ligne, puis retour à aujourd'hui (26/09 >= 21/09)
    await page.getByLabel('Aller à une date').fill('2026-11-14')
    await expect(page.locator('th').filter({ hasText: '14/11/2026' })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('button', { name: "Aujourd'hui" }).click()
    await expect(page.locator('th').filter({ hasText: '26/09/2026' })).toBeVisible({
      timeout: 15_000,
    })

    // D : « Gérer les chaînes » — création d'une chaîne = nouvelle COLONNE
    await page.getByRole('button', { name: 'Gérer les chaînes' }).click()
    await page.getByLabel('Nom').fill('Chaine Playwright')
    await page.getByRole('button', { name: 'Ajouter la chaîne' }).click()
    await expect(
      page.locator('th').filter({ hasText: 'Chaine Playwright' }),
    ).toBeVisible({ timeout: 25_000 })
    await page.keyboard.press('Escape')

    // E : CRUD ligne de date — AJOUT, cellule dessus, modification, suppression
    await page.getByRole('button', { name: 'Ajouter une date' }).click()
    const creerDialog = page.getByRole('dialog').filter({ hasText: 'Ajouter une date' })
    await creerDialog.getByLabel("Date d'export").fill(DATE_CREATE)
    await creerDialog.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await expect(creerDialog).not.toBeVisible({ timeout: 15_000 })
    await page.getByLabel('Aller à une date').fill(DATE_CREATE)
    await expect(page.locator('th').filter({ hasText: fmt(DATE_CREATE) })).toBeVisible({
      timeout: 15_000,
    })

    // E : créer une cellule sur la nouvelle ligne (chaîne colonne)
    const ligneDate = page.locator('tbody tr').filter({ hasText: fmt(DATE_CREATE) })
    await ligneDate.getByTitle('Planifier une commande').first().click()
    await page.getByLabel('Numéro de commande').fill(NUMERO_CELLULE)
    await page.getByRole('button', { name: 'Planifier', exact: true }).click()
    await expect(page.getByText(NUMERO_CELLULE, { exact: true })).toBeVisible({ timeout: 25_000 })

    // E : MODIFIER la ligne (les cellules suivent) DATE_CREATE → DATE_MODIFIE
    const ligneAvant = page.locator('tbody tr').filter({ hasText: fmt(DATE_CREATE) })
    await ligneAvant.getByTitle('Modifier la date').click()
    const modifierDialog = page.getByRole('dialog').filter({ hasText: 'Modifier la date' })
    await modifierDialog.getByLabel("Date d'export").fill(DATE_MODIFIE)
    await modifierDialog.getByRole('button', { name: 'Modifier', exact: true }).click()
    await expect(modifierDialog).not.toBeVisible({ timeout: 15_000 })
    // la ligne modifiée change de position triée → on re-navigue vers elle
    await page.getByLabel('Aller à une date').fill(DATE_MODIFIE)
    const ligneApres = page.locator('tbody tr').filter({ hasText: fmt(DATE_MODIFIE) })
    await expect(ligneApres).toBeVisible({ timeout: 15_000 })
    await expect(ligneApres.getByText(NUMERO_CELLULE, { exact: true })).toBeVisible()

    // E : SUPPRIMER la cellule (confirm) puis la ligne de date (éditeur → confirm)
    await ligneApres.getByTitle('Supprimer', { exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(page.getByText(NUMERO_CELLULE, { exact: true })).toHaveCount(0, {
      timeout: 15_000,
    })

    await page
      .locator('tbody tr')
      .filter({ hasText: fmt(DATE_MODIFIE) })
      .getByTitle('Modifier la date')
      .click()
    const supprDialog = page.getByRole('dialog').filter({ hasText: 'Modifier la date' })
    await supprDialog.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(page.locator('th').filter({ hasText: fmt(DATE_MODIFIE) })).toHaveCount(0, {
      timeout: 15_000,
    })

    // F : la cloche reçoit les notifications des changements de planning
    await page.getByRole('button', { name: 'Notifications' }).click()
    await expect(
      page.getByText(/Le planning a changé/).first(),
    ).toBeVisible({ timeout: 25_000 })
    await page.screenshot({ path: 'e2e/lot2-planning-admin-1440.png', fullPage: true })
    await page.keyboard.press('Escape')

    // F5 : persistance — la cellule seedée reste visible après rechargement.
    // En dev mode, le reload peut atterrir pendant une recompilation du serveur
    // (bundle JS bloqué → aucune requête client émise) ou sur /login. On
    // ré-authentifie alors, sinon on recharge jusqu'à ce que la grille rende.
    await page.reload()
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(1500)
      if (new URL(page.url()).pathname === '/login') {
        await login(page, EMAIL_ADMIN, MDP_ADMIN)
        break
      }
      try {
        await expect(page.locator('th').filter({ hasText: 'Chaine Test HTTP' })).toBeVisible({
          timeout: 30_000,
        })
        break
      } catch {
        if (i === 2) throw new Error('Planning : grille absente après 3 rechargements (F5)')
        await page.reload()
      }
    }
    await expect(page.getByText('79-PO-TEST-001')).toBeVisible({ timeout: 25_000 })
  })

  test('NON-ADMIN 375px : Planning absent du drawer, /planning direct sans crash', async ({
    page,
  }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page, 'nonadmin@test.com', 'NonAdmin123')

    await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
    await expect(page.getByRole('link', { name: 'Mouvements' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: 'Planning' })).toHaveCount(0)
    await page.screenshot({ path: 'e2e/lot2-planning-nonadmin-375-menu.png', fullPage: true })
    await page.getByRole('button', { name: 'Fermer' }).click()

    await page.goto(`${BASE}/planning`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Planning de production')).toBeVisible({ timeout: 30_000 })
    const body = await page.textContent('body')
    expect(body).not.toContain('filter is not a function')
    expect(body).not.toContain('Application error')
    await page.screenshot({ path: 'e2e/lot2-planning-nonadmin-375.png', fullPage: true })
  })

  test('CROSS-ACCOUNT : un changement par admin2 apparaît dans la cloche d\'admin (polling)', async ({
    browser,
  }) => {
    test.setTimeout(240_000)
    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await login(pageA, 'admin@gestiontextile.com', 'Admin123!')
    await login(pageB, 'admin2@test.com', 'Admin2.123')

    await pageA.goto(`${BASE}/planning`)
    await expect(pageA.locator('th').filter({ hasText: 'Chaine Test HTTP' })).toBeVisible({
      timeout: 25_000,
    })
    await pageA.getByRole('button', { name: 'Notifications' }).click()

    await pageB.goto(`${BASE}/planning`)
    await expect(pageB.locator('th').filter({ hasText: 'Chaine Test HTTP' })).toBeVisible({
      timeout: 25_000,
    })
    // B crée une cellule sur la première case vide de la fenêtre
    await pageB.locator('button[title="Planifier une commande"]').first().click()
    await pageB.getByLabel('Numéro de commande').fill(NUMERO_CROSS)
    await pageB.getByRole('button', { name: 'Planifier', exact: true }).click()
    await expect(pageB.getByText(NUMERO_CROSS, { exact: true }).first()).toBeVisible({
      timeout: 25_000,
    })

    await expect(pageA.getByText(NUMERO_CROSS, { exact: false }).first()).toBeVisible({
      timeout: 90_000,
    })
    await pageA.screenshot({ path: 'e2e/lot2-planning-crossaccount-bell.png', fullPage: true })

    await ctxA.close()
    await ctxB.close()
  })
})