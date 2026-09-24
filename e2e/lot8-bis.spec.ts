import { test, expect, type Page } from '@playwright/test'

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'

type ApiResult = { status: number; data: unknown }

// Toutes les requêtes passent par le proxy Next (/api/proxy) : l'authentification
// vient du cookie httpOnly ims_token posé lors du login UI (jamais d'en-tête manuel).
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

// Commande + OF + export coupe→qualité (définit la référence du tour 1) +
// contrôle Interne tour 1 (chaîne source = ST, garde envoi retouche) +
// étape de gamme opératoire (document 5.3) pour la page Production.
async function creerDonnees(page: Page): Promise<{ commandeId: number; numeroOF: string; chaineNom: string }> {
  const ts = Date.now()

  const clientRes = await api(page, '/api/Client', 'POST', {
    nom: `L8 Client ${ts}`,
    prenom: null,
    nomEntreprise: null,
    email: `l8-${ts}@example.com`,
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

  const numeroOF = `OF-L8-${ts}`
  const ofRes = await api(page, '/api/OrdreFabrication', 'POST', { commandeId, numeroOF, notes: null })
  expect(ofRes.status).toBe(200)
  const ofId = (ofRes.data as { id: number }).id

  await api(page, `/api/OrdreFabrication/${ofId}/Tailles`, 'POST', [
    { taille: 'M', quantite: 100 },
    { taille: 'L', quantite: 50 },
  ])

  const chaineNom = `L8 ST ${ts}`
  const chaineRes = await api(page, '/api/ChaineProduction', 'POST', {
    nom: chaineNom,
    typeChaine: 'Confection',
  })
  expect(chaineRes.status).toBe(200)
  const chaineId = (chaineRes.data as { id: number }).id

  // Export atelier → qualité : référence du tour 1 = 100 (triplet commande/chaine/taille M).
  const exportRes = await api(page, `/api/RapportCoupe/${commandeId}/Exports`, 'POST', {
    taille: 'M',
    quantiteExportee: 100,
    chaineProductionId: chaineId,
    forcerDepassement: true,
    notes: 'lot8-bis',
  })
  expect(exportRes.status).toBe(200)

  // Contrôle Interne tour 1 : référence 100, retouche déclarée 40, chaîne = ST (garde envoi).
  const controleRes = await api(page, '/api/ControleQualite', 'POST', {
    ordreFabricationId: ofId,
    chaineProductionId: chaineId,
    typeControle: 'Interne',
    taille: 'M',
    quantiteControlee: 100,
    quantiteAcceptee: 60,
    quantiteRetouche: 40,
    quantiteRebut: 0,
    effectuePar: 'QA-Playwright',
    notes: null,
  })
  expect(controleRes.status).toBeLessThan(300)

  // Étape de gamme opératoire (document 5.3) pour la page Production.
  const etapeRes = await api(page, '/api/OrdreFabricationEtape', 'POST', {
    ordreFabricationId: ofId,
    typeEtape: 'ControleQualite',
    statut: 'EnCours',
    chaineProductionId: null,
    responsableAssigne: 'QA-Playwright',
    tempsTheoriqueHeures: 2,
    notes: 'gamme LOT8',
  })
  expect(etapeRes.status).toBe(200)

  return { commandeId, numeroOF, chaineNom }
}

// User non-admin jetable : rôle sans aucune permission + compte, via l'API (cookie admin).
const FLAGS_EVERAIS: Record<string, boolean> = {}

for (const f of [
  'peutGererStock', 'peutGererCommandes', 'peutGererTaches', 'peutGererClients',
  'peutGererFournisseurs', 'peutGererAchats', 'peutGererImportations', 'peutGererUtilisateurs',
  'peutGererMouvements', 'peutGererPlateformes', 'peutVoirMouvements', 'peutVoirCommandes',
  'peutVoirClients', 'peutVoirFournisseurs', 'peutVoirPlateformes', 'peutVoirTaches',
  'peutVoirUtilisateurs', 'peutVoirRoles', 'peutValiderStock', 'peutConfirmerAchats',
  'peutValiderImportations', 'peutVoirDashboard', 'peutVoirRapports', 'peutVoirFactures',
  'peutGererFactures', 'peutVoirMachines', 'peutGererMachines', 'peutVoirCoupe',
  'peutGererCoupe', 'peutVoirPlanning', 'peutGererPlanning', 'peutVoirProduction',
  'peutGererProduction', 'peutVoirQualite', 'peutGererQualite',
]) {
  FLAGS_EVERAIS[f] = false
}

async function creerNonAdmin(page: Page): Promise<{ email: string; password: string }> {
  const ts = Date.now()
  await login(page)

  const roleRes = await api(page, '/api/roles', 'POST', {
    name: `L8 NA ${ts}`,
    description: 'role de test sans aucune permission',
    estAdministrateur: false,
    ...FLAGS_EVERAIS,
  })
  expect(roleRes.status).toBe(200)
  const roleId = (roleRes.data as { id: number }).id

  const email = `na${ts}@test.com`
  const password = `NaPlaywright${ts}!`
  const regRes = await api(page, '/api/Auth/register', 'POST', {
    nom: 'Playwright',
    prenom: 'NonAdmin',
    email,
    password,
    roleId,
  })
  expect(regRes.status).toBe(200)

  return { email, password }
}

test.describe('LOT 8-BIS — Qualité & Production', () => {
  test('admin 1440 — board qualité (4 statuts), cycle Réception+Contrôle, Renvoyer plafond, page production', async ({ page }) => {
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId, numeroOF, chaineNom } = await creerDonnees(page)

    // ▸ Board Qualité : 4 statuts visibles
    await gotoPage(page, '/qualite', /Contrôle qualité/)
    await expect(page.getByText('Contrôles', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Acceptées', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('En retouche', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Rebut', { exact: true }).first()).toBeVisible()

    // ▸ Dialog « Réception + Contrôle » (fil du cycle)
    await page.getByRole('button', { name: 'Nouveau contrôle' }).click()
    const reception = page.getByRole('dialog', { name: /Réception \+ Contrôle/ })
    await expect(reception).toBeVisible()
    await expect(reception.getByText(/cycle qualité/)).toBeVisible()
    await expect(reception.getByText(/plafond de référence appliqué côté serveur/)).toBeVisible()
    await expect(reception.getByText('Ordre de fabrication')).toBeVisible()
    await reception.getByRole('button', { name: 'Annuler' }).click()
    await expect(reception).toBeHidden()

    // ▸ La ligne du contrôle du tour 1 (retouche 40)
    await page.locator('input[type="number"]').first().fill(String(commandeId))
    const row = page.locator('tr').filter({ hasText: 'Interne' }).filter({ hasText: '40' })
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Référence disponible :')).toBeVisible({ timeout: 15_000 })

    // ▸ Dialog « Renvoyer » — plafond affiché
    await row.getByRole('button', { name: 'Renvoyer' }).click()
    const renvoyer = page.getByRole('dialog', { name: /Renvoyer en retouche/ })
    await expect(renvoyer).toBeVisible()
    await expect(renvoyer.getByText(/plafond strict/)).toBeVisible()
    await expect(renvoyer.getByText(/quantité retouche = 40/)).toBeVisible()

    // Chaîne source du contrôle (garde : l'envoi part vers SA chaîne) — on sélectionne la ST créée.
    await renvoyer.getByRole('combobox').click()
    await page.getByRole('option').filter({ hasText: chaineNom }).click()

    // Garde-fou : 41 > plafond 40 rejeté
    await renvoyer.locator('input[type="number"]').fill('41')
    await renvoyer.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByText(/Plafond strict — envoi rejeté/)).toBeVisible({ timeout: 15_000 })

    // Tour 2 du cycle : envoi dans le plafond (chaîne sous-traitante)
    await renvoyer.locator('input[type="number"]').fill('10')
    await renvoyer.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByText(/Envoi retouche n°\d+ enregistré/)).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: 'e2e/lot8-qualite-board-1440.png', fullPage: false })

    // ▸ Page Production : gamme opératoire OF (5.3)
    await gotoPage(page, '/production', /Module Production/)
    await expect(page.getByText('Étapes OF', { exact: true })).toBeVisible()
    await page.locator('input[type="number"]').first().fill(String(commandeId))
    const ofRow = page.locator('tr').filter({ hasText: numeroOF })
    await expect(ofRow).toBeVisible({ timeout: 15_000 })
    await expect(ofRow.getByText('Contrôle qualité').first()).toBeVisible()
    await expect(ofRow.getByText('EnCours').first()).toBeVisible()
    await page.screenshot({ path: 'e2e/lot8-production-1440.png', fullPage: false })
  })

  test('admin 375 — qualité en cartes (4 statuts + Renvoyer plafond) et production accessible', async ({ page }) => {
    page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    const { commandeId, numeroOF } = await creerDonnees(page)

    await gotoPage(page, '/qualite', /Contrôle qualité/)
    await expect(page.getByText('Contrôles', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Acceptées', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('En retouche', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Rebut', { exact: true }).first()).toBeVisible()

    await page.locator('input[type="number"]').first().fill(String(commandeId))
    // Vue mobile : le tableau bascule en cartes repliées ; « Détails » révèle la ligne du contrôle.
    await page.getByRole('button', { name: 'Détails' }).first().click()
    await expect(page.getByText('Interne', { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await page.locator('button:visible', { hasText: 'Renvoyer' }).first().click()

    const renvoyer = page.getByRole('dialog', { name: /Renvoyer en retouche/ })
    await expect(renvoyer).toBeVisible()
    await expect(renvoyer.getByText(/plafond strict/)).toBeVisible()
    await expect(renvoyer.getByText(/quantité retouche = 40/)).toBeVisible()
    await page.screenshot({ path: 'e2e/lot8-qualite-board-375.png', fullPage: false })

    await gotoPage(page, '/production', /Module Production/)
    await page.locator('input[type="number"]').first().fill(String(commandeId))
    // Vue mobile : le tableau bascule en cartes ; l'OF est le titre de la carte (desktop caché en DOM).
    await page.getByRole('button', { name: 'Détails' }).first().click()
    await expect(page.locator('span:visible', { hasText: numeroOF }).first()).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: 'e2e/lot8-production-375.png', fullPage: false })
  })

  test('non-admin 1440 — /qualite et /production en Accès refusé', async ({ page }) => {
    page.setViewportSize({ width: 1440, height: 900 })
    const { email, password } = await creerNonAdmin(page)
    await login(page, email, password)

    await gotoPage(page, '/qualite', /Accès refusé/)
    await expect(page.getByText(/module « qualite » non autorisé/)).toBeVisible()
    await expect(page.getByText('Contrôles', { exact: true })).toHaveCount(0)

    await gotoPage(page, '/production', /Accès refusé/)
    await expect(page.getByText(/module « production » non autorisé/)).toBeVisible()
    await page.screenshot({ path: 'e2e/lot8-nonadmin-1440.png', fullPage: false })
  })

  test('non-admin 375 — /qualite en Accès refusé', async ({ page }) => {
    page.setViewportSize({ width: 375, height: 812 })
    const { email, password } = await creerNonAdmin(page)
    await login(page, email, password)

    await gotoPage(page, '/qualite', /Accès refusé/)
    await expect(page.getByText(/module « qualite » non autorisé/)).toBeVisible()
    await page.screenshot({ path: 'e2e/lot8-nonadmin-375.png', fullPage: false })
  })
})