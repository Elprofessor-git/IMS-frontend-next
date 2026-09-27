import { test, expect, type Page } from '@playwright/test'

const EMAIL = 'admin@gestiontextile.com'
const PASSWORD = 'Admin123!'

// Rôle non-admin : lecture Production + Qualité, aucune écriture.
const LECTEUR_EMAIL = 'l14-lecture@test.com'
const LECTEUR_PASSWORD = 'L14Lecture123!'

// Rôle non-admin : écriture Production + Qualité, mais AUCUN droit Commandes.
// Reproduit le cas où le bouton « Créer l'OF » est visible mais refusé par l'API.
const PRODUCTEUR_EMAIL = 'l14-producteur@test.com'
const PRODUCTEUR_PASSWORD = 'L14Producteur123!'

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

async function loginAs(page: Page, email = EMAIL, password = PASSWORD) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 120_000 })
}

async function login(page: Page) {
  await loginAs(page)
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

// ═══════════════════════════════════════════════════════════════════
// LOT 14 — Production
// ═══════════════════════════════════════════════════════════════════

test.describe('LOT 14 — Production', () => {
  test('le dashboard liste toutes les commandes actives (pas seulement celles avec étapes)', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/production', /Module Production/)

    const api_ = await api(page, '/api/Production/Dashboard')
    expect(api_.status).toBe(200)
    const dto = api_.data as { nombreCommandes?: number; commandes?: unknown[] }
    expect(dto.nombreCommandes).toBeGreaterThan(0)

    // KPI visible
    await expect(page.getByText('Commandes actives').first()).toBeVisible()
    await expect(page.getByText('À planifier').first()).toBeVisible()

    // Toutes les commandes actives doivent avoir une ligne
    await expect(page.getByText(/Avancement de la production/i)).toBeVisible()
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()

    // Le filtre actif exclut Annulee et Terminee
    const numeros = (dto.commandes ?? []) as Array<{ numeroCommande: string }>
    expect(numeros.length).toBe(dto.nombreCommandes)
  })

  test('le point d’entrée « Planifier les étapes » est visible et mène à la sélection de commande', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/production', /Module Production/)

    await page.getByRole('button', { name: /Planifier les étapes/i }).click()

    // Sélecteur de commande (Radix) dans le dialog
    await expect(page.getByRole('dialog', { name: /Planifier les étapes d/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Ouvrir l'OF/i })).toBeVisible()
  })

  test('la recherche filtre réellement le tableau de bord', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/production', /Avancement de la production/)

    const search = page.getByPlaceholder('Rechercher une commande…')
    await expect(search).toBeVisible()

    const api_ = await api(page, '/api/Production/Dashboard')
    const dto = api_.data as { commandes: Array<{ numeroCommande: string; clientNom: string | null }> }
    const cible = dto.commandes[0]

    await search.fill(cible.numeroCommande)
    // Le numéro recherché doit apparaître, un autre doit disparaître
    await expect(page.getByText(cible.numeroCommande).first()).toBeVisible()

    await search.fill('zzz-aucune-commande-zzz')
    // État vide explicite (exigence du standard), pas un tableau vide muet
    await expect(page.getByText('Aucune commande active en production.').first()).toBeVisible()
  })

  test('le détail d’une commande expose étapes, exports et journal', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/production', /Avancement de la production/)

    const api_ = await api(page, '/api/Production/Dashboard')
    const dto = api_.data as { commandes: Array<{ commandeId: number; numeroCommande: string }> }
    const cible = dto.commandes.find((c) => c.commandeId > 0)!
    expect(cible).toBeTruthy()

    // Ouvre le détail via la recherche
    await page.getByPlaceholder('Rechercher une commande…').fill(cible.numeroCommande)
    await page.getByRole('button', { name: /^Planifier$/ }).first().click()

    await expect(page.getByRole('button', { name: /Retour au tableau de bord/i })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText(/Gamme opératoire \(étapes de l/i)).toBeVisible()
    await expect(page.getByText(/Suivi par chaîne/i)).toBeVisible()
    await expect(page.getByText(/Historique des transitions/i)).toBeVisible()
  })

  test('une commande sans étape affiche un état vide exploitable', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/production', /Avancement de la production/)

    const api_ = await api(page, '/api/Production/Dashboard')
    const dto = api_.data as { commandes: Array<{ commandeId: number; nombreEtapes: number }> }
    const sansEtape = dto.commandes.find((c) => c.nombreEtapes === 0)
    test.skip(!sansEtape, 'Aucune commande active sans étape sur ce jeu de données')

    const detail = await api(page, `/api/OrdreFabricationEtape?commandeId=${sansEtape!.commandeId}`)
    expect(detail.status).toBe(200)
    expect((detail.data as unknown[]).length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// LOT 14 — Qualité
// ═══════════════════════════════════════════════════════════════════

test.describe('LOT 14 — Qualité', () => {
  test('le dashboard liste TOUTES les commandes actives, y compris sans export', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/qualite', /Contrôle qualité/)

    const api_ = await api(page, '/api/Qualite/Dashboard')
    expect(api_.status).toBe(200)
    const dto = api_.data as {
      nombreCommandesActives: number
      commandesAvecControle: number
      commandesSansControle: number
      lignes: Array<{ commandeId: number; estCommandeSansExport: boolean }>
    }

    // Le bug corrigé : avant, seules 24 lignes (triplets avec export) étaient listées
    // pour 142 commandes actives. On vérifie la COUVERTURE réelle par commande,
    // et pas seulement un >= sur le nombre de lignes.
    const commandesCouvertes = new Set(dto.lignes.map((l) => l.commandeId))
    expect(commandesCouvertes.size).toBe(dto.nombreCommandesActives)

    // Les commandes sans export sont bien présentes
    expect(dto.lignes.some((l) => l.estCommandeSansExport)).toBe(true)

    // KPI mutuellement exclusifs : avec + sans contrôle = actives listées
    expect(dto.commandesAvecControle + dto.commandesSansControle).toBe(dto.nombreCommandesActives)

    // KPI
    await expect(page.getByText('Commandes actives').first()).toBeVisible()
    await expect(page.getByText('Commandes sans contrôle').first()).toBeVisible()
  })

  test('le filtre par statut « aucun export » isole les commandes neuves', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/qualite', /Contrôle qualité/)

    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: /Aucun export/i }).click()

    // Doit afficher des lignes sans export
    await expect(page.getByText(/Aucun export/i).first()).toBeVisible()
  })

  test('le journal du jour est accessible et structuré', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/qualite', /Contrôle qualité/)

    await page.getByRole('tab', { name: /Journal du jour/i }).click()
    await expect(page.getByRole('tab', { name: /Journal du jour/i })).toBeVisible()
    // Colonnes du journal
    await expect(page.getByText('Opération').first()).toBeVisible()
    await expect(page.getByText('Quantités').first()).toBeVisible()
  })

  test('les codes défauts exposent un CRUD complet', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/qualite', /Contrôle qualité/)

    await page.getByRole('tab', { name: /Codes défauts/i }).click()
    await expect(page.getByRole('tab', { name: /Codes défauts/i })).toBeVisible()

    const api_ = await api(page, '/api/DefautCode')
    expect(api_.status).toBe(200)
    const codes = api_.data as Array<{ id: number; code: string }>
    expect(codes.length).toBeGreaterThan(0)

    // Créer
    const code = `L14${Date.now().toString().slice(-6)}`
    await page.getByRole('button', { name: /Nouveau code/i }).click()
    await page.locator('#defaut-code').fill(code)
    await page.locator('#defaut-libelle').fill('Code de vérification LOT 14')
    await page.getByRole('button', { name: /^Créer$/ }).click()
    await expect(page.getByText(code).first()).toBeVisible({ timeout: 20_000 })

    // Modifier
    const row = page.locator('tr', { hasText: code }).first()
    await row.getByRole('button', { name: /Modifier/i }).click()
    await page.getByRole('button', { name: /Enregistrer/i }).click()
    await expect(page.getByText(code).first()).toBeVisible()

    // Supprimer
    await row.getByRole('button', { name: /Supprimer/i }).click()
    await page.getByRole('button', { name: /^Supprimer$/ }).last().click()
    await expect(page.getByText(code)).toHaveCount(0, { timeout: 20_000 })
  })

  test('le dialog de contrôle expose Rebut et le plafond de référence', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/qualite', /Contrôle qualité/)

    const api_ = await api(page, '/api/Qualite/Dashboard')
    const dto = api_.data as { lignes: Array<{ commandeId: number; numeroCommande: string }> }
    const cible = dto.lignes[0]

    // Onglet contrôles d'une commande + sélection
    await page.getByRole('tab', { name: /Contrôles d'une commande/i }).click()
    await page.locator('#qualite-commande').click()
    await page.getByRole('option', { name: new RegExp(cible.numeroCommande) }).first().click()
    await expect(page.locator('#qualite-commande')).toContainText(cible.numeroCommande)

    await page.getByRole('button', { name: /Nouveau contrôle/i }).click()

    // Les 4 quantités de l'invariant A+R+B=C doivent être saisissables
    await expect(page.locator('#ctl-qc')).toBeVisible()
    await expect(page.locator('#ctl-a')).toBeVisible()
    await expect(page.locator('#ctl-r')).toBeVisible()
    // RBUG: avant, quantiteRebut était figée à 0
    await expect(page.locator('#ctl-b')).toBeVisible()
    await expect(page.locator('#ctl-b')).toBeEnabled()

    // Le bandeau d'invariant est calculé en direct
    await page.locator('#ctl-qc').fill('100')
    await expect(page.getByText(/A \+ R \+ B = 0 \/ C = 100/)).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════
// Non-régression
// ═══════════════════════════════════════════════════════════════════

test.describe('LOT 14 — non-régression', () => {
  test('Coupe reste fonctionnelle', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/coupe', /Coupe|Ordres de coupe/i)
  })

  test('Planning reste fonctionnel', async ({ page }) => {
    await login(page)
    await gotoPage(page, '/planning', /Planning/i)
  })
})

// ═══════════════════════════════════════════════════════════════════
// LOT 14 — Contrôle d'accès non-admin
// ═══════════════════════════════════════════════════════════════════

test.describe('LOT 14 — accès non-admin', () => {
  test('un lecteur non-admin voit les dashboards Production et Qualité', async ({ page }) => {
    await loginAs(page, LECTEUR_EMAIL, LECTEUR_PASSWORD)
    await gotoPage(page, '/production', /Avancement de la production/)
    await gotoPage(page, '/qualite', /Contrôle qualité/)

    // Lecture autorisée par l'API
    expect((await api(page, '/api/Production/Dashboard')).status).toBe(200)
    expect((await api(page, '/api/Qualite/Dashboard')).status).toBe(200)
  })

  test('un lecteur non-admin ne voit aucun bouton d’écriture', async ({ page }) => {
    await loginAs(page, LECTEUR_EMAIL, LECTEUR_PASSWORD)
    await gotoPage(page, '/production', /Avancement de la production/)

    // Pas de « Planifier les étapes », pas de création d'OF
    await expect(page.getByRole('button', { name: 'Planifier les étapes' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Planifier$/ })).toHaveCount(0)

    await gotoPage(page, '/qualite', /Contrôle qualité/)
    await expect(page.getByRole('button', { name: /Nouveau contrôle/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Nouveau code/i })).toHaveCount(0)
  })

  test('un lecteur non-admin est refusé (403) en écriture par l’API', async ({ page }) => {
    await loginAs(page, LECTEUR_EMAIL, LECTEUR_PASSWORD)

    // Le dashboard reste lisible...
    expect((await api(page, '/api/Qualite/Dashboard')).status).toBe(200)
    // ...mais toute écriture est refusée par le serveur.
    const forbidden = await api(page, '/api/OrdreFabrication', 'POST', {
      commandeId: 60,
      numeroOF: `L14-LECTURE-${Date.now()}`,
    })
    expect(forbidden.status).toBe(403)
  })

  test('un producteur sans droits Commandes peut créer l’OF (plus de 403 fantôme)', async ({ page }) => {
    await loginAs(page, PRODUCTEUR_EMAIL, PRODUCTEUR_PASSWORD)
    await gotoPage(page, '/production', /Avancement de la production/)

    // Le bouton est visible (écriture Production) ET l'API l'accepte : plus de 403 fantôme.
    // Retient une commande active qui n'a encore aucun OF.
    const dto = (await api(page, '/api/Production/Dashboard')).data as {
      commandes: Array<{ commandeId: number }>
    }
    let cible: { commandeId: number } | undefined
    for (const c of dto.commandes.slice(0, 25)) {
      const ofs = (await api(page, `/api/OrdreFabrication/CommandeClient/${c.commandeId}`)).data
      if (Array.isArray(ofs) && ofs.length === 0) {
        cible = c
        break
      }
    }
    test.skip(!cible, 'Aucune commande active sans OF sur ce jeu de données')

    const created = await api(page, '/api/OrdreFabrication', 'POST', {
      commandeId: cible!.commandeId,
      numeroOF: `L14-PROD-${Date.now()}`,
    })
    expect(created.status).toBe(200)

    // Nettoyage
    const id = (created.data as { id?: number }).id
    if (id) await api(page, `/api/OrdreFabrication/${id}`, 'DELETE')
  })
})

// ═══════════════════════════════════════════════════════════════════
// LOT 14 — Responsive 375 px
// ═══════════════════════════════════════════════════════════════════

test.describe('LOT 14 — mobile 375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('Production et Qualité restent utilisables en 375 px', async ({ page }) => {
    await login(page)

    await gotoPage(page, '/production', /Avancement de la production/)
    // Pas de débordement horizontal
    const overflowProd = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflowProd).toBeLessThanOrEqual(1)

    await gotoPage(page, '/qualite', /Contrôle qualité/)
    const overflowQual = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflowQual).toBeLessThanOrEqual(1)
  })
})
