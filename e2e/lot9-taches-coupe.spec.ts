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

// ── Création de données : plateforme, client, commande (M100/L50), OF ──
async function creerCommande(page: Page): Promise<{ commandeId: number; numeroCommande: string; clientNom: string }> {
  const ts = Date.now()
  const plateformeRes = await api(page, '/api/Plateforme', 'POST', { nom: `L9 Plateforme ${ts}` })
  expect(plateformeRes.status).toBe(201)
  const plateformeId = (plateformeRes.data as { id: number }).id

  const clientNom = `L9 Client ${ts}`
  const clientRes = await api(page, '/api/Client', 'POST', {
    nom: clientNom,
    prenom: null,
    nomEntreprise: null,
    email: `l9-${ts}@example.com`,
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
  const commande = commandeRes.data as { id: number; numeroCommande: string }
  const commandeId = commande.id

  const taillesRes = await api(page, `/api/CommandeClient/${commandeId}/Tailles`, 'POST', [
    { taille: 'M', quantite: 100 },
    { taille: 'L', quantite: 50 },
  ])
  expect(taillesRes.status).toBe(200)

  const ofRes = await api(page, '/api/OrdreFabrication', 'POST', {
    commandeId,
    numeroOF: `OF-L9-${ts}`,
  })
  expect(ofRes.status).toBe(200)

  return { commandeId, numeroCommande: commande.numeroCommande, clientNom }
}

test('LOT 9 — Coupe : plan de coupe par matelas + document Ordre de coupe', async ({ page }) => {
  page.setViewportSize({ width: 1440, height: 900 })
  await login(page)
  const ts = Date.now()
  const { commandeId, numeroCommande, clientNom } = await creerCommande(page)

  // ── Matelas + plan (L1) via API ──
  const numeroMatelas = `M-L9-${ts}`
  const matelasRes = await api(page, '/api/Matelas', 'POST', {
    numeroMatelas,
    commandeId,
    piecePliage: 2,
    longueur: 5.2,
    laize: 1.6,
  })
  expect(matelasRes.status).toBe(201)
  const matelasId = (matelasRes.data as { id: number }).id

  // Ligne du plan : taille M × 50 occurrences × 2 plis = total théorique 100
  const planRes = await api(page, `/api/Matelas/${matelasId}/PlanDeCoupe`, 'POST', {
    taille: 'M',
    occurrences: 50,
  })
  expect(planRes.status).toBeLessThan(300)

  // ── Onglet UNIQUE « Ordre de coupe » (LOT 11 : plan + document fusionnés) ──
  await gotoPage(page, `/coupe/${commandeId}`, /Ordre de coupe/)
  await expect(page.getByRole('tab', { name: /Ordre de coupe/ })).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(1)

  const ligneMatelas = page
    .getByRole('link', { name: `Saisie de coupe du matelas ${numeroMatelas}` })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg border")]')
    .first()
  await expect(ligneMatelas).toBeVisible()
  // Le plan du matelas est résumé sur la ligne : M · 100 (= 50 occurrences × 2 plis)
  await expect(ligneMatelas.getByText(/M\s*·\s*100/).first()).toBeVisible()
  await expect(ligneMatelas).toContainText(/Plan total\s*100/)
  await expect(ligneMatelas).toContainText(/reste à\s*couper\s*100/)

  // ── Une coupe réelle fige le plan (verrou) ──
  const coupeRes = await api(page, `/api/RapportCoupe/${commandeId}/Coupes`, 'POST', {
    taille: 'M',
    quantiteCoupee: 60,
    matelasId,
  })
  expect(coupeRes.status).toBeLessThan(300)

  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await expect(page.getByText(/plan figé \(60 pièce\(s\) coupée\(s\)\)/)).toBeVisible({ timeout: 30_000 })
  // Verrou visible : badge + reste à couper recalculé (100 − 60 = 40)
  const ligneVerrouillee = page
    .getByRole('link', { name: `Saisie de coupe du matelas ${numeroMatelas}` })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg border")]')
    .first()
  await expect(ligneVerrouillee).toContainText(/=\s*40/)
  await expect(ligneVerrouillee).toContainText(/reste à\s*couper\s*40/)

  // ── Document Ordre de coupe : couverture par taille, dans le même onglet ──
  await expect(page.getByText('Couverture par taille')).toBeVisible()
  await expect(page.getByText(/Plan total\s*100\s*·\s*Coupé\s*60/)).toBeVisible({ timeout: 15_000 })

  const couverture = page.getByRole('table').first()
  const rowM = couverture.getByRole('row').filter({ hasText: /^M\d/ }).first()
  await expect(rowM).toContainText('100')
  await expect(rowM).toContainText('60')
  await expect(rowM.getByText('dans la marge')).toBeVisible()

  await expect(page.getByText('Matelas planifiés')).toBeVisible()
  await page.screenshot({ path: 'e2e/lot9-ordre-coupe-1440.png', fullPage: false }).catch(() => null)

  // ── Module Tâches : groupes & suivi + sélecteur de nom de commande ──
  await gotoPage(page, '/taches', /Tâches de production/)
  await expect(page.getByRole('tab', { name: /Tâches/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Groupes & suivi/ })).toBeVisible()

  await page.getByRole('tab', { name: /Groupes & suivi/ }).click()

  // Créer un groupe via l'UI
  const nomGroupe = `E2E Groupe ${ts}`
  await page.getByRole('button', { name: /Nouveau groupe/ }).click()
  const groupeDialog = page.getByRole('dialog', { name: /Nouveau groupe de tâches/ })
  await expect(groupeDialog).toBeVisible()
  await groupeDialog.locator('input').first().fill(nomGroupe)
  await groupeDialog.getByRole('button', { name: 'Créer le groupe' }).click()

  const groupeCard = page.getByText(nomGroupe, { exact: true }).locator('xpath=ancestor::div[@data-slot="card"]')
  await expect(groupeCard).toBeVisible()

  // Ajouter une ligne au gabarit
  await groupeCard.getByRole('button', { name: /Ajouter une ligne/ }).click()
  await groupeCard.getByPlaceholder('Titre de la tâche à générer').fill('Piquer manches')
  await groupeCard.getByPlaceholder('Équipe').fill('Atelier 1')
  await groupeCard.getByRole('button', { name: /Ajouter la ligne/ }).click()
  await expect(groupeCard.getByText('Piquer manches')).toBeVisible()

  // Appliquer le groupe à la commande créée
  await groupeCard.getByRole('combobox').last().click()
  await page.getByPlaceholder('Rechercher par titre, client, numéro…').fill(clientNom.slice(0, 2))
  const option = page.getByRole('option').filter({ hasText: numeroCommande })
  await expect(option.first()).toBeVisible({ timeout: 15_000 })
  await option.first().click()
  await groupeCard.getByRole('button', { name: 'Appliquer', exact: true }).click()
  await expect(page.getByText(/tâche\(s\) générée\(s\) pour la commande/).first()).toBeVisible({ timeout: 20_000 })

  await expect(groupeCard.getByText('1 commande(s)', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(groupeCard.getByText('1 tâche(s) générée(s)', { exact: true })).toBeVisible()

  // Suivi par commande (calcul client) : la commande apparaît avec 1 tâche générée
  const suiviRow = page.getByText(new RegExp(numeroCommande), { exact: false }).locator('xpath=ancestor::div[contains(@class,"rounded-lg border bg-card p-3")]')
  await expect(suiviRow).toBeVisible({ timeout: 15_000 })
  await expect(suiviRow.getByText('1 tâches', { exact: true })).toBeVisible()
  await expect(suiviRow.getByText('0 terminées', { exact: true })).toBeVisible()

  // La tâche générée apparaît dans le kanban « Tâches »
  await page.getByRole('tab', { name: /^Tâches$/ }).click()
  await expect(page.getByText('Piquer manches').first()).toBeAttached({ timeout: 15_000 })

  // Nouvelle tâche directe : sélecteur PAR NOM de commande (plus de champ ID)
  await page.getByRole('button', { name: /Nouvelle tâche/ }).click()
  const tacheDialog = page.getByRole('dialog', { name: /Nouvelle tâche de production/ })
  await expect(tacheDialog).toBeVisible()
  await expect(tacheDialog.getByText('Commande (optionnel)')).toBeVisible()
  await expect(tacheDialog.locator('input[type="number"]')).toHaveCount(1) // seule la durée, plus d'ID
  await tacheDialog.locator('input').first().fill('Tache directe L9')
  await tacheDialog.getByRole('combobox').filter({ hasText: 'Aucune — tâche libre' }).click()
  await page.getByPlaceholder('Rechercher par titre, client, numéro…').fill(clientNom.slice(0, 2))
  await page.getByRole('option').filter({ hasText: numeroCommande }).first().click()
  await tacheDialog.getByRole('button', { name: 'Créer', exact: true }).click()
  await expect(page.getByText('Tache directe L9').first()).toBeAttached({ timeout: 15_000 })

  console.log(`commandeId=${commandeId} matelasId=${matelasId} groupe=${nomGroupe}`)
})

test('LOT 9 — Coupe : seuil = demande × (1+marge/100), sans/repli ForcerDepassement', async ({ page }) => {
  page.setViewportSize({ width: 1440, height: 900 })
  await login(page)
  const { commandeId } = await creerCommande(page)

  // Marge de sécurité 5.5 % sur la commande → seuil de la taille M = 100 × 1.055 = 105.5.
  // Le flux « écran de calcul/front » (POST /Calculer) est la seule écriture de
  // MargeSecuriteDefaut ; une ligne BOM tissu est requise au préalable.
  // Aucun code implémenté n'appelle les méthodes protégées — ce e2e exerce l'API
  // existante sur données jetables.
  const articleRes = await api(page, '/api/Article', 'POST', {
    designation: 'Tissu seuil e2e',
    unite: 'm',
    laize: 1.6,
    categorie: 'Tissu',
  })
  expect(articleRes.status).toBe(201)
  const articleId = (articleRes.data as { id: number }).id

  const bomRes = await api(page, `/api/CommandeClient/${commandeId}/Bom`, 'POST', [
    { articleId, quantiteParPiece: 1, unite: 'm', estConsommableTissu: true },
  ])
  expect(bomRes.status).toBe(200)

  const calculRes = await api(page, `/api/CommandeClient/${commandeId}/Calculer`, 'POST', {
    margeAppliquee: 5.5,
  })
  expect(calculRes.status).toBe(200)

  // 105 ≤ 105.5 : accepté sans forcer (passe sans repli).
  const okRes = await api(page, `/api/RapportCoupe/${commandeId}/Coupes`, 'POST', {
    taille: 'M',
    quantiteCoupee: 105,
  })
  expect(okRes.status).toBeLessThan(300)

  // 106 > 105.5 : rejeté SANS « forcer le dépassement ».
  const koRes = await api(page, `/api/RapportCoupe/${commandeId}/Coupes`, 'POST', {
    taille: 'M',
    quantiteCoupee: 1,
  })
  expect(koRes.status).toBe(409)
  const ko = koRes.data as { message: string; seuilDepassement: number; totalCoupe: number; quantiteCommande: number }
  expect(ko.message).toContain('Dépassement de coupe')
  expect(Number(ko.seuilDepassement)).toBeCloseTo(105.5, 1)
  expect(Number(ko.totalCoupe)).toBe(106)

  // Avec le repli ForcerDepassement:true , la même coupe passe (marge dépassée, enregistrée).
  const repliRes = await api(page, `/api/RapportCoupe/${commandeId}/Coupes`, 'POST', {
    taille: 'M',
    quantiteCoupee: 1,
    forcerDepassement: true,
    notes: 'repli e2e L9',
  })
  expect(repliRes.status).toBe(200)

  // Le rapport de coupe reflète le réel : coupé 106, DepassementCoupe true.
  const rapportRes = await api(page, `/api/RapportCoupe/${commandeId}`)
  expect(rapportRes.status).toBe(200)
  const rapport = rapportRes.data as {
    tailles: { taille: string; quantiteCommande: number; quantiteCoupee: number; depassementCoupe: boolean }[]
  }
  const ligneM = rapport.tailles.find((t) => t.taille === 'M')
  expect(ligneM?.quantiteCoupee).toBe(106)
  expect(ligneM?.depassementCoupe).toBe(true)

  console.log(`seuil e2e: commandeId=${commandeId} seuil=105.5 ok=105 rejeté/sans-repli=106 forcé=106`)
})