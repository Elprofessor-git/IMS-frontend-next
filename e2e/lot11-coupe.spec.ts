import { test, expect, type Page } from '@playwright/test'

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'

type ApiResult = { status: number; data: unknown }

// Toutes les requêtes passent par le proxy Next (/api/proxy) : l'authentification
// vient du cookie httpOnly ims_token posé lors du login UI.
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

async function gotoPage(page: Page, path: string, waitFor: RegExp | string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => {})
    try {
      await page.getByText(waitFor).first().waitFor({ state: 'visible', timeout: 30_000 })
      return
    } catch {
      // premier chargement (compilation Next) avorté : nouvelle tentative
    }
  }
  throw new Error(`Page ${path} introuvable (attendu ${waitFor})`)
}

// Commande de test : plateforme + client + commande + tailles M=100 / L=50.
async function creerCommande(page: Page): Promise<{ commandeId: number; numeroCommande: string }> {
  const ts = Date.now()
  const plateformeRes = await api(page, '/api/Plateforme', 'POST', { nom: `L11 Plateforme ${ts}` })
  expect(plateformeRes.status).toBe(201)
  const plateformeId = (plateformeRes.data as { id: number }).id

  const clientRes = await api(page, '/api/Client', 'POST', {
    nom: `L11 Client ${ts}`,
    prenom: null,
    nomEntreprise: null,
    email: `l11-${ts}@example.com`,
    telephone: null,
    adresse: null,
    ville: null,
    codePostal: null,
    pays: null,
    plateformeId,
    estActif: true,
  })
  expect(clientRes.status).toBe(201)

  const commandeRes = await api(page, '/api/CommandeClient', 'POST', {
    clientId: (clientRes.data as { id: number }).id,
  })
  expect(commandeRes.status).toBe(201)
  const commande = commandeRes.data as { id: number; numeroCommande: string }

  const taillesRes = await api(page, `/api/CommandeClient/${commande.id}/Tailles`, 'POST', [
    { taille: 'M', quantite: 100 },
    { taille: 'L', quantite: 50 },
  ])
  expect(taillesRes.status).toBe(200)

  return { commandeId: commande.id, numeroCommande: commande.numeroCommande }
}

// Crée un matelas + son plan (taille M, occurrences) DEPUIS L'ONGLET « Ordre de coupe »,
// puis renvoie la ligne de matelas affichée.
async function creerMatelasViaUI(
  page: Page,
  commandeId: number,
  numero: string,
  plis: number,
  occurrences: number,
  longueur: number,
) {
  await page.getByRole('button', { name: /Nouveau matelas/ }).click()
  const dialog = page.getByRole('dialog', { name: /Nouveau matelas/ })
  await expect(dialog).toBeVisible()
  await dialog.locator('#creer-matelas-numero').fill(numero)
  await dialog.locator('#creer-matelas-plis').fill(String(plis))
  await dialog.locator('#creer-matelas-longueur').fill(String(longueur))
  await dialog.getByRole('button', { name: /Créer le matelas/ }).click()
  await expect(dialog).toBeHidden({ timeout: 20_000 })

  const link = page.getByRole('link', { name: `Saisie de coupe du matelas ${numero}` })
  await expect(link).toBeVisible({ timeout: 20_000 })

  // Ouvrir le plan de ce matelas, puis ajouter la ligne M.
  const row = link.locator('xpath=ancestor::div[contains(@class,"rounded-lg border")]').first()
  await row.getByTitle('Modifier le plan de ce matelas').click()
  const href = (await link.getAttribute('href')) ?? ''
  const matelasId = Number(href.split('/').filter(Boolean).pop())
  await page.locator(`#taille-plan-${matelasId}`).click()
  await page.getByRole('option', { name: 'M', exact: true }).click()
  await page.locator(`#occ-plan-${matelasId}`).fill(String(occurrences))
  await page.getByRole('button', { name: /Ajouter au plan/ }).click()
  await expect(row.getByText('Occurrences').first()).toBeVisible({ timeout: 20_000 })

  return { link, row, matelasId }
}

test('LOT 11 — 1440px : Ordre de coupe → clic matelas → saisie de coupe → reste à couper mis à jour', async ({
  page,
}) => {
  page.setViewportSize({ width: 1440, height: 900 })
  await login(page)
  const ts = Date.now()
  const { commandeId, numeroCommande } = await creerCommande(page)

  // ── 1. Onglet UNIQUE « Ordre de coupe » : plus de « Plan de coupe », plus de « Rapport de coupe »
  await gotoPage(page, `/coupe/${commandeId}`, /Ordre de coupe/)
  await expect(page.getByRole('tab', { name: /Ordre de coupe/ })).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(1)
  await expect(page.getByRole('tab', { name: /Plan de coupe/ })).toHaveCount(0)

  // ── 2. Le mot « Rapport » est absent du CONTENU du module Coupe.
  //      La sidebar conserve le module « Rapports » (/rapports) : module distinct, hors périmètre.
  for (const chemin of [`/coupe/${commandeId}`, '/coupe']) {
    await gotoPage(page, chemin, /Module Coupe/)
    const contenu = (await page.locator('main').innerText()).trim()
    expect(contenu, `"Rapport" ne doit pas apparaître sur ${chemin}`).not.toMatch(/rapport/i)
  }

  // ── 3. Créer 2 matelas + leur plan depuis cet onglet
  await gotoPage(page, `/coupe/${commandeId}`, /Ordre de coupe/)
  const m1 = await creerMatelasViaUI(page, commandeId, `M1-L11-${ts}`, 2, 50, 5.2)
  // théorique = 50 occurrences × 2 plis = 100, rien coupé → reste 100
  await expect(m1.row.getByText(/=\s*100/).first()).toBeVisible({ timeout: 20_000 })
  await expect(m1.row.getByText(/Plan total\s*100/).first()).toBeVisible()

  const m2 = await creerMatelasViaUI(page, commandeId, `M2-L11-${ts}`, 2, 20, 4.1)
  // théorique = 20 × 2 = 40
  await expect(m2.row.getByText(/=\s*40/).first()).toBeVisible({ timeout: 20_000 })

  // Couverture par taille : Σ plan = 140, reste à couper = 140
  await expect(page.getByText(/Plan total\s*140/).first()).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: 'e2e/lot11-apres-ordre-coupe-1440.png', fullPage: true })

  // ── 4. Clic sur le matelas 1 → écran « Saisie de coupe » scopé
  await m1.link.click()
  await expect(page).toHaveURL(new RegExp(`/coupe/${commandeId}/matelas/${m1.matelasId}$`))
  await expect(page.getByText('Saisie de coupe').first()).toBeVisible({ timeout: 20_000 })
  // « Rapport » absent du contenu de l'écran de saisie également
  expect(await page.locator('main').innerText()).not.toMatch(/rapport/i)
  // Identité du matelas en en-tête (numéro + plan), pas dans un select
  await expect(page.getByText(`M1-L11-${ts}`).first()).toBeVisible()
  await expect(page.getByText(/Enregistrer ce qui a été coupé/)).toBeVisible()
  await expect(page.getByText(/Enregistrer un export/)).toBeVisible()
  // Le sélecteur de matelas a disparu
  await expect(page.getByText('Sans matelas')).toHaveCount(0)
  await expect(page.getByText('Matelas', { exact: true })).toHaveCount(0)
  // Reste à copier par taille, visible avant saisie
  const resteAvant = page.getByText('Reste à couper par taille')
  await expect(resteAvant).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: /^M\d/ }).last()).toContainText('100')
  await page.screenshot({ path: 'e2e/lot11-apres-saisie-coupe-1440.png', fullPage: true })

  // ── 5. Saisir une coupe PARTIELLE (60 sur 100)
  await page.locator('#saisie-taille').click()
  await page.getByRole('option', { name: /^M/ }).first().click()
  await page.locator('#saisie-quantite').fill('60')
  await page.getByRole('button', { name: /Valider la coupe/ }).click()
  await expect(page.getByText('Coupe enregistrée').first()).toBeVisible({ timeout: 20_000 })
  // Reste recalculé immédiatement, sans F5 : 100 − 60 = 40
  await expect(page.getByRole('row').filter({ hasText: /^M\d/ }).last()).toContainText('40', {
    timeout: 20_000,
  })
  await expect(page.getByText('Taille M — 60 pièce(s)')).toBeVisible()

  // ── 6. Retour à l'ordre de coupe : le reste à couper de la ligne a changé
  await page.getByRole('link', { name: /Retour à l'ordre de coupe/ }).click()
  await expect(page).toHaveURL(new RegExp(`/coupe/${commandeId}$`))
  const ligneM1 = page
    .getByRole('link', { name: `Saisie de coupe du matelas M1-L11-${ts}` })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg border")]')
    .first()
  await expect(ligneM1).toContainText('= 40', { timeout: 20_000 })
  await expect(ligneM1).not.toContainText('= 100')
  // Le second matelas est intact
  const ligneM2 = page
    .getByRole('link', { name: `Saisie de coupe du matelas M2-L11-${ts}` })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg border")]')
    .first()
  await expect(ligneM2).toContainText('= 40')
  await page.screenshot({ path: 'e2e/lot11-apres-retour-reste-1440.png', fullPage: true })

  // ── 7. Tableau de bord global : KPI, restes par commande, journal du jour
  await gotoPage(page, '/coupe', /Tableau de bord transversal|Module Coupe/)
  await expect(page.getByText('Pièces commandées')).toBeVisible()
  await expect(page.getByText('Restant à couper')).toBeVisible()
  await expect(page.getByText('Restant à planifier')).toBeVisible()
  const ligneCmd = page.getByRole('row').filter({ hasText: numeroCommande }).first()
  await expect(ligneCmd).toContainText('40') // 100 plan − 60 coupé
  await expect(ligneCmd).toContainText('50') // 150 demandées − 100 plan
  await expect(page.getByText('Journal du jour').last()).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: `M1-L11-${ts}` }).first()).toContainText('60')
  // La liste plate « Ordre de coupe » globale a disparu
  await expect(page.getByRole('tab')).toHaveCount(0)
  await page.screenshot({ path: 'e2e/lot11-apres-dashboard-1440.png', fullPage: true })

  console.log(`L11 1440: commandeId=${commandeId} matelas1=${m1.matelasId} matelas2=${m2.matelasId}`)
})

test('LOT 11 — 375px : parcours complet Ordre de coupe → Saisie de coupe', async ({ page }) => {
  page.setViewportSize({ width: 375, height: 800 })
  await login(page)
  const ts = Date.now()
  const { commandeId } = await creerCommande(page)

  await gotoPage(page, `/coupe/${commandeId}`, /Ordre de coupe/)
  await expect(page.getByRole('tab', { name: /Ordre de coupe/ })).toBeVisible()
  await expect(await page.locator('main').innerText()).not.toMatch(/rapport/i)

  const m1 = await creerMatelasViaUI(page, commandeId, `M1-L11-M-${ts}`, 3, 20, 6.4)
  // 20 × 3 plis = 60
  await expect(m1.row.getByText(/=\s*60/).first()).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: 'e2e/lot11-apres-ordre-coupe-375.png', fullPage: true })

  await m1.link.click()
  await expect(page.getByText(/Enregistrer ce qui a été coupé/)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Sans matelas')).toHaveCount(0)
  await page.screenshot({ path: 'e2e/lot11-apres-saisie-coupe-375.png', fullPage: true })

  await page.locator('#saisie-taille').click()
  await page.getByRole('option', { name: /^M/ }).first().click()
  await page.locator('#saisie-quantite').fill('25')
  await page.getByRole('button', { name: /Valider la coupe/ }).click()
  await expect(page.getByText('Taille M — 25 pièce(s)')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('row').filter({ hasText: /^M\d/ }).last()).toContainText('35')

  await page.getByRole('link', { name: /Retour à l'ordre de coupe/ }).click()
  const ligneM1 = page
    .getByRole('link', { name: `Saisie de coupe du matelas M1-L11-M-${ts}` })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg border")]')
    .first()
  await expect(ligneM1).toContainText('= 35', { timeout: 20_000 })
  await page.screenshot({ path: 'e2e/lot11-apres-retour-reste-375.png', fullPage: true })

  await gotoPage(page, '/coupe', /Module Coupe/)
  await expect(page.getByText('Journal du jour').last()).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: `M1-L11-M-${ts}` }).first()).toContainText('25')
  await page.screenshot({ path: 'e2e/lot11-apres-dashboard-375.png', fullPage: true })

  console.log(`L11 375: commandeId=${commandeId} matelas=${m1.matelasId}`)
})

test('LOT 11 — /commandes/{id} : l\'onglet « Rapport de coupe » reste en lecture seule (aucun bouton d\'écriture)', async ({
  page,
}) => {
  page.setViewportSize({ width: 1440, height: 900 })
  await login(page)
  const ts = Date.now()
  const { commandeId } = await creerCommande(page)

  // Une coupe réelle pour que l'historique ne soit pas vide.
  const matelasRes = await api(page, '/api/Matelas', 'POST', {
    numeroMatelas: `M-RO-${ts}`,
    commandeId,
    piecePliage: 2,
    longueur: 5,
  })
  expect(matelasRes.status).toBe(201)
  const coupeRes = await api(page, `/api/RapportCoupe/${commandeId}/Coupes`, 'POST', {
    taille: 'M',
    quantiteCoupee: 10,
    matelasId: (matelasRes.data as { id: number }).id,
  })
  expect(coupeRes.status).toBeLessThan(300)

  await gotoPage(page, `/commandes/${commandeId}`, /Rapport de coupe/)
  await page.getByRole('tab', { name: /Rapport de coupe/ }).click()

  // Consultation : suivi par taille + historique visibles
  await expect(page.getByText('Suivi par taille')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Historique des coupes')).toBeVisible()
  await expect(page.getByText('Historique des exports')).toBeVisible()
  await expect(page.getByText('Taille M — 10 pièce(s)')).toBeVisible()

  // Aucun bouton d'écriture DANS l'onglet « Rapport de coupe »
  const panneau = page.getByRole('tabpanel')
  await expect(panneau.getByRole('button', { name: /Enregistrer une coupe/ })).toHaveCount(0)
  await expect(panneau.getByRole('button', { name: /Enregistrer un export/ })).toHaveCount(0)
  await expect(panneau.getByRole('button', { name: /^Valider/ })).toHaveCount(0)
  await expect(panneau.getByRole('button', { name: /Nouveau matelas/ })).toHaveCount(0)
  await expect(panneau.getByRole('button', { name: /Forcer le dépassement/ })).toHaveCount(0)
  await expect(panneau.getByTitle('Supprimer')).toHaveCount(0)
  await expect(panneau.getByTitle('Modifier')).toHaveCount(0)
  await expect(panneau.getByText('Sans matelas')).toHaveCount(0)
  // Aucune zone de saisie non autorisee
  await expect(panneau.locator('input[type="number"]')).toHaveCount(0)

  await page.screenshot({ path: 'e2e/lot11-apres-commandes-rapport-lecture-1440.png', fullPage: true })
  console.log(`L11 lecture seule: commandeId=${commandeId}`)
})
