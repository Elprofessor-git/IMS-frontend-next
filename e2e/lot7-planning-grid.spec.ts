import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

// LOT 7 — Grille du planning : ligne fantôme + cellules multi-commandes.
// Bug 4 : une cellule orpheline (sans chaîne) à date non initialisée (DateTime.MinValue,
//         affichée « 01/01/1901 ») ne doit JAMAIS produire de ligne de date dans la grille ;
//         le garde-fou d'écriture (POST/PUT) refuse désormais date vide et chaîne absente.
// Bug 5 : une cellule = une semaine ; une chaîne peut produire plusieurs commandes dans
//         la même cellule → l'écran empile TOUTES les commandes (statut + crayon + poubelle
//         par entrée) et garde un « + » en bas de cellule pour ajouter une autre commande.
//
// Les accès API sont directs au backend ceinture (BACKEND_URL), les scénarios UI via le
// proxy Next (FRONTEND_URL).

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:3000'
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:5070'

const EMAIL_ADMIN = 'admin@gestiontextile.com'
const MDP_ADMIN = 'Admin123!'

const jitter = Math.floor(Math.random() * 100000)
let seqChaine = 0
function nomChaine(): string {
  seqChaine += 1
  return `LOT7 Chaine ${jitter}-${seqChaine}`
}
const PREFIX = '79-PO-L7'
const NUM_A = `${PREFIX}-A-${jitter}`
const NUM_B = `${PREFIX}-B-${jitter}`
const NUM_C = `${PREFIX}-C-${jitter}`
const NUM_D = `${PREFIX}-D-${jitter}`

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function court(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

// Date cible unique : aujourd'hui + 12 jours (dans la fenêtre navigateur de la grille).
const cible = new Date()
cible.setDate(cible.getDate() + 12)

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

async function login(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport)
  await page.goto(`${BASE}/login`)
  await page.fill('#email', EMAIL_ADMIN)
  await page.fill('#password', MDP_ADMIN)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 45_000 })
}

async function authJson(
  request: APIRequestContext,
  token: string,
  url: string,
  options?: Parameters<APIRequestContext['fetch']>[1],
) {
  const merged = {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers as Record<string, string> | undefined),
    },
  }
  const r = await request.fetch(`${BACKEND}${url}`, merged)
  return r
}

// ── Prérequis Bug 4 : garantit qu'une cellule fantôme existe en base ─────────
// Le garde-fou d'écriture interdit désormais de la créer par l'API ; une cellule
// orpheline à date MinValue est donc injectée DIRECTEMENT en base pendant la mise
// en place de l'environnement (voir HOTFIX_LOT7). Le test ne dépend pas d'elle
// pour passer ensemble des assertions relatives :
//   • écriture : POST null-chain / date MinValue → 400 ;
//   • lecture   : la grille ne renvoie ni ligne fantôme, ni cellule orpheline.

async function nettoyerLot7(request: APIRequestContext, token: string, idDate?: number) {
  try {
    if (idDate != null) await authJson(request, token, `/api/Planning/dates/${idDate}`, { method: 'DELETE' })
    const grille = (await (await authJson(request, token, '/api/Planning')).json()) as {
      cellules: { id: number; numeroCommande: string }[]
    }
    for (const c of grille.cellules) {
      if (c.numeroCommande?.startsWith(PREFIX)) {
        await authJson(request, token, `/api/Planning/${c.id}`, { method: 'DELETE' })
      }
    }
    const chaines = (await (
      await authJson(request, token, '/api/ChaineProduction')
    ).json()) as { id: number; nom: string }[]
    for (const c of chaines) {
      if (c.nom?.startsWith('LOT7 Chaine')) {
        await authJson(request, token, `/api/ChaineProduction/${c.id}`, { method: 'DELETE' })
      }
    }
  } catch {
    // best-effort — ne fait jamais échouer un test
  }
}

async function creerChaine(request: APIRequestContext, token: string, nom: string): Promise<number> {
  const r = await authJson(request, token, '/api/ChaineProduction', {
    method: 'POST',
    data: { nom, typeChaine: 'Decoupe' },
  })
  if (r.status() !== 200) throw new Error(`creerChaine → ${r.status()} ${await r.text()}`)
  return ((await r.json()) as { id: number }).id
}

async function creerCellule(request: APIRequestContext, token: string, chaineId: number, date: string, numero: string) {
  const r = await authJson(request, token, '/api/Planning', {
    method: 'POST',
    data: {
      chaineProductionId: chaineId,
      dateSamedi: `${date}T00:00:00Z`,
      numeroCommande: numero,
      quantite: 2,
      estLivree: false,
      notes: null,
    },
  })
  if (r.status() !== 201) throw new Error(`creerCellule ${numero} → ${r.status()} ${await r.text()}`)
}

// ── BUG 4 — ligne fantôme « 01/01/1901 » ─────────────────────────────────────

function annee(isoDate: string): number {
  return Number(isoDate.slice(0, 4))
}

test('BUG4 GRILLE 1440px : aucune ligne fantôme (date MinValue/orpheline), garde-fou écriture actif', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000)
  const token = await adminToken(request)
  await nettoyerLot7(request, token)

  // 1) Garde-fou d'écriture : POST d'une cellule orpheline (sans chaîne) à date MinValue → 400.
  const rOrpheline = await authJson(request, token, '/api/Planning', {
    method: 'POST',
    data: {
      chaineProductionId: null,
      dateSamedi: '0001-01-01T00:00:00Z',
      numeroCommande: `${PREFIX}-FANTOME-${jitter}`,
      estLivree: true,
      notes: null,
    },
  })
  expect(rOrpheline.status()).toBe(400)

  // 2) Lecture : la grille ne contient aucune ligne dérivée anté-2000 (id 0) ni cellule orpheline (null chain).
  const grille = (await (await authJson(request, token, '/api/Planning')).json()) as {
    dates: { id: number; date: string }[]
    cellules: { chaineProductionId: number | null }[]
  }
  const lignesFantomes = grille.dates.filter((d) => d.id === 0 && annee(d.date) < 2000)
  expect(lignesFantomes).toEqual([])
  const orphelines = grille.cellules.filter((c) => c.chaineProductionId === null)
  expect(orphelines).toEqual([])

  // 3) UI : aucune ligne de grille rendue sur une date « 01/01/0001 » ou « 01/01/1901 ».
  await login(page, { width: 1440, height: 900 })
  await page.goto(`${BASE}/planning`)
  await page.waitForURL('**/planning')
  await expect(page.getByText('Planning de production')).toBeVisible({ timeout: 25_000 })
  await expect(page.getByText('01/01/0001')).toHaveCount(0)
  await expect(page.getByText('01/01/1901')).toHaveCount(0)
  // Les lignes visibles sont des vraies semaines (aucune cellule vide anté-2000 dans l'en-tête de ligne).
  const enTetes = await page.locator('tbody tr th').allTextContents()
  const lignesBizarres = enTetes.filter((t) => /01\/01\/\d{4}/.test(t) && Number(t.replace(/.*\/(\d{4}).*/, '$1')) < 2000)
  expect(lignesBizarres).toEqual([])

  await page.screenshot({ path: 'e2e/lot7-bug4-admin-1440.png', fullPage: false })
})

// ── BUG 5 — plusieurs commandes dans une même cellule ────────────────────────

async function scenarioCelluleMultiple(page: Page, request: APIRequestContext, viewport: { width: number; height: number }) {
  const token = await adminToken(request)
  await nettoyerLot7(request, token)

  // Chaîne dédiée + 3 commandes distinctes sur le MÊME samedi.
  const chaineNom = nomChaine()
  const chaineId = await creerChaine(request, token, chaineNom)
  await creerCellule(request, token, chaineId, iso(cible), NUM_A)
  await creerCellule(request, token, chaineId, iso(cible), NUM_B)
  await creerCellule(request, token, chaineId, iso(cible), NUM_C)

  await login(page, viewport)
  await page.goto(`${BASE}/planning`)
  await page.waitForURL('**/planning')
  await expect(page.getByText('Planning de production')).toBeVisible({ timeout: 25_000 })

  // Naviguer vers la semaine cible pour rendre la ligne dans la fenêtre.
  await page.locator('input[aria-label="Aller à une date"]').fill(iso(cible))
  const dateRow = page.locator('tbody tr').filter({ hasText: court(cible) }).first()
  await expect(dateRow).toBeVisible({ timeout: 25_000 })

  // La colonne de la chaîne dédiée (repérée par l'en-tête) affiche les 3 commandes
  // D'UN COUP dans la même cellule (une ligne = le samedi en th, puis une td par chaîne).
  const enTetes = await page.locator('thead tr th').allTextContents()
  const chainIndex = enTetes.findIndex((t) => t.includes(chaineNom))
  if (chainIndex < 1) throw new Error(`colonne « ${chaineNom} » introuvable dans l'en-tête`)
  const cellule = dateRow.locator('td').nth(chainIndex - 1)
  await cellule.scrollIntoViewIfNeeded()
  await expect(cellule.getByText(NUM_A)).toBeVisible({ timeout: 25_000 })
  await expect(cellule.getByText(NUM_B)).toBeVisible()
  await expect(cellule.getByText(NUM_C)).toBeVisible()
  // Chacune avec son statut « En cours » (non livrée), son crayon et sa poubelle.
  await expect(cellule.getByText('En cours')).toHaveCount(3)
  await expect(cellule.getByTitle('Modifier')).toHaveCount(3)
  await expect(cellule.getByTitle('Supprimer')).toHaveCount(3)
  // Le « + » reste disponible en bas de cellule pour ajouter une 4e commande.
  await expect(cellule.getByTitle('Ajouter une commande à cette semaine')).toBeVisible()

  // 4e commande via le « + » de la cellule → les 4 s'affichent.
  await cellule.getByTitle('Ajouter une commande à cette semaine').click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Planifier une commande' })
  await expect(dialog).toBeVisible({ timeout: 25_000 })
  await dialog.getByLabel('Numéro de commande').fill(NUM_D)
  await dialog.getByRole('button', { name: 'Planifier', exact: true }).click()
  await expect(dialog).toHaveCount(0, { timeout: 15_000 })
  await expect(cellule.getByText(NUM_D)).toBeVisible({ timeout: 25_000 })
  await expect(cellule.getByText('En cours')).toHaveCount(4)

  // Une ligne date vide dans la grille ne produit aucune cellule vide pour chaîne créée hors fenêtre.
  await page.screenshot({
    path: `e2e/lot7-bug5-admin-${viewport.width}.png`,
    fullPage: false,
  })
}

test('BUG5 ADMIN 1440px : une cellule affiche 3 commandes empilées (statut + crayon + poubelle) + « + » pour la 4e', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000)
  await scenarioCelluleMultiple(page, request, { width: 1440, height: 900 })
})

test('BUG5 ADMIN 375px : une cellule affiche 3 commandes empilées sans chevauchement', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000)
  await scenarioCelluleMultiple(page, request, { width: 375, height: 812 })
})