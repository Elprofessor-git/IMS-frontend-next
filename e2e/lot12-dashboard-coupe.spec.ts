import { test, expect, type Page } from '@playwright/test'

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'

// Phase « avant » : le dashboard est encore celui du LOT 11 (dérivé de /api/Matelas).
// Phase « après » : le dashboard est branché sur /api/Coupe/Dashboard.
const PHASE = process.env.L12_PHASE === 'avant' ? 'avant' : 'apres'

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

/** Commande de test : plateforme + client + commande + tailles M=100 / L=50. */
async function creerCommande(page: Page): Promise<{ commandeId: number; numeroCommande: string }> {
  const ts = Date.now()
  const pf = await api(page, '/api/Plateforme', 'POST', { nom: `L12 Pf ${ts}` })
  expect(pf.status).toBe(201)
  const client = await api(page, '/api/Client', 'POST', {
    nom: `L12 Client ${ts}`,
    prenom: null,
    nomEntreprise: null,
    email: `l12-${ts}@example.com`,
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

test.describe(`LOT 12 — tableau de bord Coupe : commandes sans matelas (${PHASE})`, () => {
  test('1440px — une commande fraîchement créée sans matelas est listée avec reste à planifier = demande', async ({
    page,
  }) => {
    page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const { commandeId, numeroCommande } = await creerCommande(page)

    // Preuve API : la commande existe bien, sans aucun matelas.
    const matelas = await api(page, '/api/Matelas', 'GET')
    const matelasDeLaCommande = (matelas.data as { commandeId: number | null }[]).filter(
      (m) => m.commandeId === commandeId,
    )
    expect(matelasDeLaCommande, 'la commande de test ne doit avoir aucun matelas').toHaveLength(0)

    await gotoPage(page, '/coupe', /Module Coupe/)
    await expect(page.getByText('Avancement de la coupe par commande')).toBeVisible({
      timeout: 30_000,
    })

    // KPI : les 3 premiers viennent de /api/Matelas/Stats (inchangés par ce lot).
    const stats = (await api(page, '/api/Matelas/Stats', 'GET')).data as {
      totalPiecesCommandees: number
      totalPiecesCoupees: number
      totalPiecesExportees: number
    }
    await expect(page.getByText('Pièces commandées').locator('..')).toContainText(
      stats.totalPiecesCommandees.toLocaleString('fr-FR'),
    )
    await expect(page.getByText('Pièces coupées').locator('..')).toContainText(
      stats.totalPiecesCoupees.toLocaleString('fr-FR'),
    )

    const ligne = page.getByRole('row').filter({ hasText: numeroCommande }).first()
    await page.screenshot({ path: `e2e/lot12-${PHASE}-dashboard-1440.png`, fullPage: true })

    if (PHASE === 'avant') {
      // BUG (état d'origine) : le tableau de bord dérive ses lignes de /api/Matelas,
      // donc une commande sans matelas est totalement invisible.
      await expect(
        ligne,
        `AVANT (bug attendu) : la commande ${numeroCommande} ne doit PAS apparaître`,
      ).toHaveCount(0, { timeout: 15_000 })
      console.log(`L12 avant 1440: ${numeroCommande} absente du tableau (bug reproduit)`)
      return
    }

    await expect(ligne, `la commande ${numeroCommande} doit apparaître dans le tableau`).toBeVisible({
      timeout: 30_000,
    })
    // 0 matelas, 150 demandées, 0 plan, 0 coupée → reste à planifier = 150
    await expect(ligne).toContainText('150')
    await expect(ligne).toContainText('EnAttente')
    {
      // Colonnes présentes seulement après le lot : client, statut, badge 0 matelas.
      await expect(ligne).toContainText(`L12 Client`)
      await expect(ligne.locator('td').nth(3)).toContainText('0')

      // Ligne de commande = demande 150, plan 0, coupé 0, à planifier 150, à couper 0.
      const tds = ligne.locator('td')
      await expect(tds.nth(4)).toHaveText('150') // demandées
      await expect(tds.nth(5)).toHaveText('0') // plan
      await expect(tds.nth(6)).toHaveText('0') // coupées
      await expect(tds.nth(7)).toContainText('150') // à planifier
      await expect(tds.nth(8)).toHaveText('0') // à couper
      await expect(tds.nth(9)).toContainText('0%') // avancement

      // Cohérence du KPI « Restant à planifier » avec l'endpoint.
      const dash = (await api(page, '/api/Coupe/Dashboard', 'GET')).data as {
        resteAPlanifier: number
        piecesDemandees: number
      }
      expect(dash.piecesDemandees).toBe(stats.totalPiecesCommandees)
      await expect(page.getByText('Restant à planifier').locator('..')).toContainText(
        dash.resteAPlanifier.toLocaleString('fr-FR'),
      )
      // Le KPI « Restant à couper » est au moins 150 (les 150 de cette commande).
      expect(dash.resteAPlanifier).toBeGreaterThanOrEqual(150)
    }

    console.log(`L12 apres 1440: ${numeroCommande} (id ${commandeId})`)
  })

  test('375px — la commande sans matelas est listée sur mobile', async ({ page }) => {
    page.setViewportSize({ width: 375, height: 800 })
    await login(page)
    const { numeroCommande } = await creerCommande(page)

    await gotoPage(page, '/coupe', /Module Coupe/)
    const ligne = page.getByRole('row').filter({ hasText: numeroCommande }).first()
    await page.screenshot({ path: `e2e/lot12-${PHASE}-dashboard-375.png`, fullPage: true })

    if (PHASE === 'avant') {
      await expect(
        ligne,
        `AVANT (bug attendu) : la commande ${numeroCommande} ne doit PAS apparaître sur mobile`,
      ).toHaveCount(0, { timeout: 15_000 })
      console.log(`L12 avant 375: ${numeroCommande} absente du tableau (bug reproduit)`)
      return
    }

    await expect(ligne, `la commande ${numeroCommande} doit apparaître sur mobile`).toBeVisible({
      timeout: 30_000,
    })
    await expect(ligne).toContainText('150')
    console.log(`L12 apres 375: ${numeroCommande}`)
  })
})
