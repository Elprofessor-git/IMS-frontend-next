import { test, expect, type Page, type Locator } from '@playwright/test'

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'

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

/** Commande de test : plateforme + client + commande + tailles M=100 / L=50, 0 matelas. */
async function creerCommandeNeuve(page: Page): Promise<{ commandeId: number; numeroCommande: string }> {
  const ts = Date.now()
  const pf = await api(page, '/api/Plateforme', 'POST', { nom: `L12E Pf ${ts}` })
  expect(pf.status).toBe(201)
  const client = await api(page, '/api/Client', 'POST', {
    nom: `L12E Client ${ts}`,
    prenom: null,
    nomEntreprise: null,
    email: `l12e-${ts}@example.com`,
    telephone: null,
    adresse: null,
    ville: null,
    codePostal: null,
    pays: null,
    plateformeId: (pf.data as { id: number }).id,
    estActif: true,
  })
  expect(client.status).toBe(201)
  const cmd = await api(page, '/api/CommandeClient', 'POST', {
    clientId: (client.data as { id: number }).id,
  })
  expect(cmd.status).toBe(201)
  const c = cmd.data as { id: number; numeroCommande: string }
  const tailles = await api(page, `/api/CommandeClient/${c.id}/Tailles`, 'POST', [
    { taille: 'M', quantite: 100 },
    { taille: 'L', quantite: 50 },
  ])
  expect(tailles.status).toBe(200)
  return { commandeId: c.id, numeroCommande: c.numeroCommande }
}

/** Compteur de clics : on ne compte que les vraies interactions de l'utilisateur. */
function compteur() {
  let n = 0
  return {
    async clic(locator: Locator) {
      n += 1
      await locator.click()
    },
    get total() {
      return n
    },
  }
}

test.describe('LOT 12 — entrée du module Coupe : commande neuve plannifiable en moins de 3 clics', () => {
  test('1440px — bouton « Planifier » sur la ligne 0 matelas → 2 clics jusqu\'au formulaire', async ({
    page,
  }) => {
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId, numeroCommande } = await creerCommandeNeuve(page)

    await gotoPage(page, '/coupe', /Module Coupe/)

    // 1) La commande neuve (0 matelas) est bien listée, avec son bouton « Planifier ».
    const ligne = page.getByRole('row').filter({ hasText: numeroCommande }).first()
    await expect(ligne, 'la commande sans matelas doit être listée').toBeVisible({ timeout: 30_000 })
    await expect(ligne.locator('td').nth(3)).toContainText('0') // 0 matelas
    await expect(ligne.locator('td').nth(7)).toContainText('150') // reste à planifier = demande
    const btnPlanifier = ligne.getByRole('link', { name: /Planifier/ })
    await expect(btnPlanifier, 'bouton Planifier sur la ligne').toBeVisible()

    // 2) Recherche par nom de commande dans le tableau (standard de complétude).
    await page.getByLabel('Rechercher une commande').fill(numeroCommande)
    await expect(page.getByRole('row').filter({ hasText: numeroCommande })).toHaveCount(1)

    // 3) Parcours <= 3 clics : Planifier (1) puis Créer le premier matelas (2).
    const c = compteur()
    await c.clic(btnPlanifier)
    await expect(page).toHaveURL(new RegExp(`/coupe/${commandeId}$`))
    await expect(
      page.getByText('Aucun matelas planifié', { exact: false }),
      'état vide explicite sur une commande à 0 matelas',
    ).toBeVisible({ timeout: 30_000 })

    await c.clic(page.getByRole('button', { name: /Créer le premier matelas/ }))
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByLabel('N° matelas')).toBeVisible()

    console.log(`LOT12 1440 — ${numeroCommande} : ${c.total} clic(s) jusqu'au formulaire (limite : 3)`)
    expect(c.total, 'moins de 3 clics depuis /coupe').toBeLessThan(3)

    // 4) Le CRUD passe par l'UI : on crée réellement le premier matelas depuis cette modale.
    await page.fill('#creer-matelas-numero', 'M-1')
    await page.fill('#creer-matelas-plis', '2')
    await page.click('button:has-text("Créer le matelas")')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText('M-1', { exact: false }).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Aucun matelas planifié')).toBeHidden()
    await page.screenshot({ path: 'e2e/lot12-entree-apres-1440.png', fullPage: true })

    // 5) Aucune impasse : retour au point d'entrée principal en 1 clic.
    await expect(page.getByRole('link', { name: 'Tableau de bord Coupe' })).toBeVisible()
  })

  test('375px — entrée du module Coupe et état vide sur mobile', async ({ page }) => {
    page.setViewportSize({ width: 375, height: 800 })
    await login(page)
    const { commandeId, numeroCommande } = await creerCommandeNeuve(page)

    await gotoPage(page, '/coupe', /Module Coupe/)

    // Le tableau défile horizontalement en 375 px : on cible la cellule via la ligne.
    const ligne = page.getByRole('row').filter({ hasText: numeroCommande }).first()
    await expect(ligne, 'la commande sans matelas doit être listée sur mobile').toBeVisible({
      timeout: 30_000,
    })
    await expect(ligne.getByRole('link', { name: /Planifier/ })).toBeVisible()
    await page.screenshot({ path: 'e2e/lot12-entree-apres-375.png', fullPage: true })

    const c = compteur()
    await c.clic(ligne.getByRole('link', { name: /Planifier/ }))
    await expect(page).toHaveURL(new RegExp(`/coupe/${commandeId}$`))
    await expect(page.getByText('Aucun matelas planifié', { exact: false })).toBeVisible({
      timeout: 30_000,
    })
    await c.clic(page.getByRole('button', { name: /Créer le premier matelas/ }))
    await expect(page.getByLabel('N° matelas')).toBeVisible()
    console.log(`LOT12 375 — ${numeroCommande} : ${c.total} clic(s) (limite : 3)`)
    expect(c.total).toBeLessThan(3)
    await page.screenshot({ path: 'e2e/lot12-entree-vide-375.png', fullPage: true })
  })

  test('Sélecteur d\'entrée — « Nouvel ordre de coupe » avec CommandeSelect (recherche par nom)', async ({
    page,
  }) => {
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId, numeroCommande } = await creerCommandeNeuve(page)

    await gotoPage(page, '/coupe', /Module Coupe/)
    await page.getByRole('button', { name: /Nouvel ordre de coupe/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Recherche par nom de commande (le sélecteur est portal : il est hors de la modale).
    const champRecherche = page.getByRole('combobox')
    await champRecherche.click()
    await champRecherche.fill(numeroCommande)
    const option = page.getByRole('option').filter({ hasText: numeroCommande })
    await expect(option.first()).toBeVisible({ timeout: 15_000 })
    await option.first().click()

    const confirmer = dialog.getByRole('button', { name: /Ouvrir l'ordre de coupe/ })
    await expect(confirmer).toBeEnabled()
    await confirmer.click()
    await expect(page).toHaveURL(new RegExp(`/coupe/${commandeId}$`))
    await expect(page.getByText('Aucun matelas planifié', { exact: false })).toBeVisible({
      timeout: 30_000,
    })
    await page.screenshot({ path: 'e2e/lot12-selecteur-1440.png', fullPage: true })
  })

  test('Retour au point d\'entrée en 1 clic depuis la saisie de coupe', async ({ page }) => {
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId } = await creerCommandeNeuve(page)

    // Commande avec un matelas, pour atteindre l'écran de saisie.
    await gotoPage(page, `/coupe/${commandeId}`, /Module Coupe/)
    await page.getByRole('button', { name: /Créer le premier matelas/ }).click()
    await page.fill('#creer-matelas-numero', 'M-RET')
    await page.fill('#creer-matelas-plis', '2')
    await page.click('button:has-text("Créer le matelas")')
    await expect(page.getByText('M-RET', { exact: false }).first()).toBeVisible({ timeout: 30_000 })

    await page.getByRole('link', { name: /Saisie de coupe du matelas/ }).first().click()
    await expect(page).toHaveURL(new RegExp(`/coupe/${commandeId}/matelas/\\d+$`))
    const retour = page.getByRole('link', { name: 'Tableau de bord Coupe' })
    await expect(retour, 'retour au tableau de bord en 1 clic').toBeVisible()
    await retour.click()
    await expect(page).toHaveURL(/\/coupe$/)

    // L'écran de saisie garde aussi son retour vers l'ordre de coupe.
    await gotoPage(page, `/coupe/${commandeId}`, /Module Coupe/)
    await page.getByRole('link', { name: /Saisie de coupe du matelas/ }).first().click()
    await page.getByRole('link', { name: /Retour à l'ordre de coupe/ }).click()
    await expect(page).toHaveURL(new RegExp(`/coupe/${commandeId}$`))
  })
})
