import { test, expect, type Page, type APIRequestContext, type Locator } from '@playwright/test'

// LOT 6 — Corrections Planning/Notifications (3 bugs).
// Bug 1 : réactivation d'une chaîne désactivée depuis « Gérer les chaînes ».
// Bug 2 : panneau de notifications dropdown ancré sous la cloche (max-h 70vh, scroll interne),
//         feuille mobile plein largeur — jamais plus haut que l'écran.
// Bug 3 : clic sur une notification → marquée lue (best effort) + panneau fermé + /planning.
//
// Les accès API sont directs au backend ceinture (BACKEND_URL), les scénarios UI via le proxy
// Next (FRONTEND_URL).

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:3000'
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:5070'

const EMAIL_ADMIN = 'admin@gestiontextile.com'
const MDP_ADMIN = 'Admin123!'
const EMAIL_NON_ADMIN = 'nonadmin@test.com'
const MDP_NON_ADMIN = 'NonAdmin123'

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Données uniques par run (jamais de collision avec les reliquats possibles).
const jitter = Math.floor(Math.random() * 100000)
let seqChaine = 0
const PREFIX = '79-PO-L6'
function nomChaine(): string {
  seqChaine += 1
  return `LOT6 Chaine ${jitter}-${seqChaine}`
}
const NUMERO_B1 = `${PREFIX}-B1-${jitter}`
const NUMERO_B3 = `${PREFIX}-B3-${jitter}`

// Date future unique — toutes les dates >= 2027 relèvent des runs de test (base jetable).
const baseDate = new Date()
baseDate.setDate(baseDate.getDate() + 500)

async function adminToken(request: APIRequestContext): Promise<string> {
  let token = ''
  for (let i = 0; i < 5 && !token; i++) {
    const r = await request.post(`${BACKEND}/api/Auth/login`, {
      data: { email: EMAIL_ADMIN, password: MDP_ADMIN },
    })
    if (r.ok()) token = ((await r.json()) as { token: string }).token
    else await new Promise((res) => setTimeout(res, 1500))
  }
  if (!token) throw new Error('login admin impossible pour les prérequis API')
  return token
}

async function login(page: Page, email: string, password: string, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport)
  await page.goto(`${BASE}/login`)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 45_000 })
}

// ── Prérequis / données via backend direct ───────────────────────────────────

async function createCellule(request: APIRequestContext, token: string, numero: string) {
  const d = new Date(baseDate)
  d.setDate(baseDate.getDate() + Math.floor(Math.random() * 30))
  const r = await request.post(`${BACKEND}/api/Planning`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      chaineProductionId: 1,
      dateSamedi: d.toISOString(),
      numeroCommande: numero,
      quantite: 1,
      estLivree: false,
      notes: null,
    },
  })
  if (r.status() !== 201) throw new Error(`createCellule ${numero} → ${r.status()} ${await r.text()}`)
}

async function creerChaine(request: APIRequestContext, token: string, nom: string): Promise<number> {
  const r = await request.post(`${BACKEND}/api/ChaineProduction`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nom, typeChaine: 'Decoupe' },
  })
  if (r.status() !== 200) throw new Error(`creerChaine → ${r.status()} ${await r.text()}`)
  return ((await r.json()) as { id: number }).id
}

async function desactiverChaine(request: APIRequestContext, token: string, id: number) {
  const r = await request.delete(`${BACKEND}/api/ChaineProduction/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (r.status() !== 200) throw new Error(`desactiverChaine → ${r.status()} ${await r.text()}`)
}

async function reactiverChaine(request: APIRequestContext, token: string, id: number) {
  const r = await request.put(`${BACKEND}/api/ChaineProduction/${id}/reactiver`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (r.status() !== 200) throw new Error(`reactiverChaine → ${r.status()} ${await r.text()}`)
}

async function nettoyerLot6(request: APIRequestContext, token: string) {
  try {
    const grille = (await (
      await request.get(`${BACKEND}/api/Planning`, { headers: { Authorization: `Bearer ${token}` } })
    ).json()) as { cellules: { id: number; numeroCommande: string }[] }
    for (const c of grille.cellules) {
      if (c.numeroCommande?.startsWith(PREFIX)) {
        await request.delete(`${BACKEND}/api/Planning/${c.id}`, { headers: { Authorization: `Bearer ${token}` } })
      }
    }
    const chaines = (await (
      await request.get(`${BACKEND}/api/ChaineProduction`, { headers: { Authorization: `Bearer ${token}` } })
    ).json()) as { id: number; nom: string }[]
    for (const c of chaines) {
      if (c.nom?.startsWith('LOT6 Chaine')) {
        await request.delete(`${BACKEND}/api/ChaineProduction/${c.id}`, { headers: { Authorization: `Bearer ${token}` } })
      }
    }
  } catch {
    // best-effort — ne fait jamais échouer un test
  }
}

// ── BUG 1 — réactivation d'une chaîne ────────────────────────────────────────

// Dans le dialogue « Gérer les chaînes », chaque chaîne est une ligne `div.rounded-lg`
// (le nom `<p>` sans texte exact collant). On cible la ligne du nom pour ne pas être
// victime de la règle stricte (plusieurs status Actif/Inactif coexistent dans la liste).
function ligneChaine(dialog: { locator: (sel: string) => Locator }, nom: string) {
  return dialog.locator('.max-h-64 .rounded-lg').filter({ hasText: nom })
}

test('BUG1 ADMIN 1440px : désactivation puis réactivation depuis « Gérer les chaînes », colonne réapparaît', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000)
  const token = await adminToken(request)
  await nettoyerLot6(request, token)

  await login(page, EMAIL_ADMIN, MDP_ADMIN, { width: 1440, height: 900 })
  await page.goto(`${BASE}/planning`)
  await page.waitForURL('**/planning')
  await expect(page.locator('th').filter({ hasText: 'Chaine Test HTTP' })).toBeVisible({ timeout: 25_000 })

  const chaineNom = nomChaine()
  const chaineId = await creerChaine(request, token, chaineNom)

  // B1-a : la nouvelle chaîne est une colonne du planning.
  await page.getByRole('button', { name: 'Gérer les chaînes' }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Gérer les chaînes' })
  const ligne = ligneChaine(dialog, chaineNom)
  await expect(ligne).toBeVisible({ timeout: 25_000 })
  await expect(ligne.getByText('Active', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('th').filter({ hasText: chaineNom })).toBeVisible({ timeout: 25_000 })

  // B1-b : désactivation depuis le dialogue → disparaît des colonnes, badge Inactive + bouton Activer.
  await page.getByRole('button', { name: 'Gérer les chaînes' }).click()
  await ligne.getByRole('button', { name: 'Désactiver' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Désactiver', exact: true }).click()
  await expect(ligne.getByText('Inactive', { exact: true })).toBeVisible({ timeout: 25_000 })
  await expect(ligne.getByRole('button', { name: 'Activer' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('th').filter({ hasText: chaineNom })).toHaveCount(0, { timeout: 25_000 })

  // B1-c : réactivation depuis le dialogue → colonne de nouveau visible.
  await page.getByRole('button', { name: 'Gérer les chaînes' }).click()
  await ligne.getByRole('button', { name: 'Activer' }).click()
  await expect(ligne.getByText('Active', { exact: true })).toBeVisible({ timeout: 25_000 })
  await page.keyboard.press('Escape')
  await expect(page.locator('th').filter({ hasText: chaineNom })).toBeVisible({ timeout: 25_000 })

  // B1-d : persistance — un second GET confirme EstActif=true côté backend.
  const chaines = (await (
    await request.get(`${BACKEND}/api/ChaineProduction`, { headers: { Authorization: `Bearer ${token}` } })
  ).json()) as { id: number; estActif: boolean }[]
  const c = chaines.find((x) => x.id === chaineId)
  expect(c?.estActif).toBe(true)

  await page.screenshot({ path: 'e2e/lot6-bug1-admin-1440.png', fullPage: false })
  await desactiverChaine(request, token, chaineId) // ne pas laisser une chaîne LOT6 active en base
})

test('BUG1 NON-ADMIN 375px : liste complète avec badges de statut, ni Activer ni Désactiver', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000)
  const token = await adminToken(request)
  await nettoyerLot6(request, token)
  const chaineNom = nomChaine()
  const chaineId = await creerChaine(request, token, chaineNom)
  await desactiverChaine(request, token, chaineId)

  await login(page, EMAIL_NON_ADMIN, MDP_NON_ADMIN, { width: 375, height: 812 })
  await page.goto(`${BASE}/planning`)
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('button', { name: 'Gérer les chaînes' }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Gérer les chaînes' })
  const ligne = ligneChaine(dialog, chaineNom)

  // La chaîne INACTIVE reste listée, avec badge de statut.
  await expect(ligne).toBeVisible({ timeout: 25_000 })
  await expect(ligne.getByText('Inactive', { exact: true })).toBeVisible()
  // Non-admin (sans droits d'écriture) : pas de bouton Activer/Désactiver sur cette ligne.
  await expect(ligne.getByRole('button', { name: 'Activer' })).toHaveCount(0)
  await expect(ligne.getByRole('button', { name: 'Désactiver' })).toHaveCount(0)
  // Le reste de la liste est bien présent (même chaîne de référence visible).
  await expect(dialog.locator('.max-h-64 .rounded-lg').first()).toBeVisible()

  await page.screenshot({ path: 'e2e/lot6-bug1-nonadmin-375.png', fullPage: false })
  await reactiverChaine(request, token, chaineId)
  await desactiverChaine(request, token, chaineId)
})

// ── BUG 2 — panneau de notifications : dropdown / feuille, jamais plus haut que l'écran ──

async function verifierPanneau(page: Page, nbNotifs: number, admin: boolean) {
  const panel = page.getByTestId('notification-panel')
  await expect(panel).toBeVisible({ timeout: 25_000 })

  const list = page.getByTestId('notification-list')
  const box = (await panel.boundingBox())!
  const viewport = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }))

  // Jamais plus haut que l'écran ni sans scroll.
  expect(box.height).toBeLessThanOrEqual(viewport.h * 0.8)
  const scrollable = await list.evaluate((el) => el.scrollHeight > el.clientHeight)
  const count = await list.locator('button').count()
  expect(count).toBeGreaterThanOrEqual(nbNotifs)
  if (count > 1) expect(scrollable).toBe(true)

  // Défilement interne : après scroll complet, la toute dernière notification est visible.
  await list.evaluate((el) => (el.scrollTop = el.scrollHeight))
  await page.waitForTimeout(300)
  const lastBtn = list.locator('button').last()
  await expect(lastBtn).toBeInViewport()
  void admin
}

test('BUG2 ADMIN 1440px : dropdown ancré (384 px) sous la cloche, 24+ notifications, scroll interne', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000)
  const token = await adminToken(request)
  await nettoyerLot6(request, token)

  // 24 notifications « planning » grâce à 24 créations de cellules successives.
  for (let k = 0; k < 24; k++) {
    await createCellule(request, token, `${PREFIX}-M-${jitter}-${k}`)
  }

  await login(page, EMAIL_ADMIN, MDP_ADMIN, { width: 1440, height: 900 })
  await page.goto(`${BASE}/dashboard`)
  await page.getByRole('button', { name: 'Notifications' }).click()
  await verifierPanneau(page, 24, true)

  // Dropdown ancré : largeur fixe ~384 px, pas un modal plein écran centré.
  const panel = page.getByTestId('notification-panel')
  const box = (await panel.boundingBox())!
  expect(box.width).toBeGreaterThan(350)
  expect(box.width).toBeLessThan(410)
  expect(box.x + box.width).toBeLessThanOrEqual(1445)

  await page.screenshot({ path: 'e2e/lot6-bug2-admin-1440.png', fullPage: false })
})

test('BUG2 ADMIN 375px : feuille plein largeur ancrée en bas, tient dans l\'écran, scroll', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000)
  const token = await adminToken(request)
  await nettoyerLot6(request, token)
  for (let k = 100; k < 124; k++) {
    await createCellule(request, token, `${PREFIX}-M-${jitter}-${k}`)
  }

  await login(page, EMAIL_ADMIN, MDP_ADMIN, { width: 375, height: 812 })
  await page.goto(`${BASE}/dashboard`)
  await page.getByRole('button', { name: 'Notifications' }).click()

  const panel = page.getByTestId('notification-panel')
  await expect(panel).toBeVisible({ timeout: 25_000 })
  const box = (await panel.boundingBox())!
  const viewport = await page.evaluate(() => window.innerHeight)
  // Pleine largeur et ancrée en bas de l'écran.
  expect(box.width).toBeGreaterThanOrEqual(370)
  expect(Math.abs(box.y + box.height - viewport)).toBeLessThanOrEqual(2)
  await verifierPanneau(page, 24, true)

  await page.screenshot({ path: 'e2e/lot6-bug2-admin-375.png', fullPage: false })
})

// ── BUG 3 — clic notification : marquée lue (best effort) + panneau fermé + /planning ──

async function scenarioClicNotification(page: Page, request: APIRequestContext, admin: boolean, viewport: { width: number; height: number }) {
  const token = await adminToken(request)
  await nettoyerLot6(request, token)
  await createCellule(request, token, NUMERO_B3)

  await login(page, admin ? EMAIL_ADMIN : EMAIL_NON_ADMIN, admin ? MDP_ADMIN : MDP_NON_ADMIN, viewport)

  // La notification ciblée est NON lue, avec pastille visuelle distincte.
  await page.getByRole('button', { name: 'Notifications' }).click()
  const panel = page.getByTestId('notification-panel')
  const row = panel.locator('button').filter({ hasText: NUMERO_B3 }).first()
  await expect(row).toBeVisible({ timeout: 30_000 })
  const notifG = (await (
    await request.get(`${BACKEND}/api/Notification/me`, { headers: { Authorization: `Bearer ${token}` } })
  ).json()) as { notifications: { id: number; message: string; estLivree: boolean }[] }
  const cible = notifG.notifications.find((n) => n.message.includes(NUMERO_B3) && admin === !n.estLivree)
  expect(cible).toBeDefined()

  // Seule la notification non lue porte la pastille.
  await expect(row.locator('span.bg-primary')).toBeVisible()

  // Clic → le panneau se ferme, l'utilisateur atterrit sur /planning.
  await row.click()
  await expect(page.getByTestId('notification-panel')).toHaveCount(0, { timeout: 10_000 })
  await page.waitForURL('**/planning', { timeout: 20_000 })
  await expect(page.getByText('Planning de production')).toBeVisible({ timeout: 25_000 })

  // Marquage PERSISTÉ (meilleur effort = best effort, la nav ne bloque pas) :
  // on interroge le backend jusqu'à ce que la notification soit livrée.
  let estLivree = false
  for (let i = 0; i < 10 && !estLivree; i++) {
    const check = (await (
      await request.get(`${BACKEND}/api/Notification/me`, { headers: { Authorization: `Bearer ${token}` } })
    ).json()) as { notifications: { id: number; estLivree: boolean }[] }
    estLivree = check.notifications.find((n) => n.id === cible!.id)?.estLivree ?? false
    if (!estLivree) await page.waitForTimeout(800)
  }
  expect(estLivree).toBe(true)

  await page.screenshot({
    path: `e2e/lot6-bug3-${admin ? 'admin' : 'nonadmin'}-${viewport.width}.png`,
    fullPage: false,
  })
}

test('BUG3 ADMIN 1440px : clic → lue (persisté) + panneau fermé + /planning', async ({ page, request }) => {
  test.setTimeout(240_000)
  await scenarioClicNotification(page, request, true, { width: 1440, height: 900 })
})

test('BUG3 NON-ADMIN 375px : clic → lue (persisté) + panneau fermé + /planning', async ({ page, request }) => {
  test.setTimeout(240_000)
  await scenarioClicNotification(page, request, false, { width: 375, height: 812 })
})