import { test, expect, type Page, type Route } from '@playwright/test'

const JETON = [
  btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  btoa(JSON.stringify({
    sub: 'e2e-c2',
    unique_name: 'C2 E2E',
    email: 'c2@gestiontextile.com',
    role: 'Administrateur',
    plateformId: 1,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })),
  'signature',
].join('.')

// Serveur factice de l'API Ordre de coupe : les mutations modifient l'état, les
// lectures le recalculent (restes, résumé) exactement comme le backend C2.
type Taille = { id: number; index: number; libelle: string; quantiteDemandee: number; quantiteAvecMarge: number; notes: null }
type Plan = { id: number; index: number; libelle: string | null; plis: number; matelasId: null; matelasNumero: null; verrouille: boolean; occurrences: { taille: string; occurrences: number }[] }
type Matiere = { id: number; designation: string; laize: number; consoClient: number; consoReelle: number | null; ecartConso: number | null; retraitPourcentage: number; metresRecus: number; notes: null; utilises: number; retrait: number; stockRestant: number; alerte: boolean }

type Etat = { tailles: Taille[]; plans: Plan[]; matieres: Matiere[]; prochainPlan: number; prochainMatiere: number }

function etatInitial(): Etat {
  return {
    tailles: [
      { id: 1, index: 0, libelle: 'M', quantiteDemandee: 10, quantiteAvecMarge: 11, notes: null },
      { id: 2, index: 1, libelle: 'L', quantiteDemandee: 5, quantiteAvecMarge: 5.5, notes: null },
    ],
    plans: [
      {
        id: 10, index: 0, libelle: null, plis: 5, matelasId: null, matelasNumero: null, verrouille: false,
        occurrences: [{ taille: 'M', occurrences: 4 }],
      },
    ],
    matieres: [
      {
        id: 20, designation: 'Tissu jean', laize: 150, consoClient: 1, consoReelle: null, ecartConso: null,
        retraitPourcentage: 0, metresRecus: 5, notes: null, utilises: 10, retrait: 0, stockRestant: -5, alerte: true,
      },
    ],
    prochainPlan: 11,
    prochainMatiere: 21,
  }
}

function restesApresPlan(etat: Etat, i: number): { taille: string; valeur: number }[] {
  return etat.tailles.map((t) => {
    let cumul = 0
    for (let j = 0; j <= i; j++) {
      const plan = etat.plans[j]
      const occ = plan.occurrences.find((o) => o.taille === t.libelle)?.occurrences ?? 0
      cumul += plan.plis * occ
    }
    return { taille: t.libelle, valeur: t.quantiteDemandee - cumul }
  })
}

function ordreComplet(etat: Etat) {
  let totalPlanifie = 0
  etat.plans.forEach((p) => {
    totalPlanifie += p.plis * p.occurrences.reduce((s, o) => s + o.occurrences, 0)
  })
  const totalCommande = etat.tailles.reduce((s, t) => s + t.quantiteDemandee, 0)
  const ecart = totalPlanifie - totalCommande
  return {
    id: 1,
    commandeId: 1,
    numeroCommande: 'CMD-001',
    modele: 'PDJ22',
    couleur: 'ECRU',
    chaineProductionId: null,
    chaineProductionNom: null,
    margeSecurite: 10,
    margePersonnalisee: false,
    referenceOF: null,
    notes: null,
    dateCreation: new Date().toISOString(),
    dateMiseAJour: null,
    verrouille: false,
    totalCommande,
    totalPlanifie,
    surplus: Math.max(0, ecart),
    manque: Math.max(0, -ecart),
    alerteManque: ecart < 0,
    tailles: etat.tailles,
    plans: etat.plans.map((p, i) => ({ ...p, index: i, restes: restesApresPlan(etat, i) })),
    matieres: etat.matieres,
  }
}

async function ouvrir(page: Page, etat: Etat) {
  await page.context().addCookies([{ name: 'sgt_token', value: JETON, url: 'http://localhost:3000' }])
  await page.route('**/api/**', async (route: Route) => {
    const chemin = new URL(route.request().url()).pathname.replace(/^\/api\/proxy/, '')
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (chemin === '/api/Auth/me') {
      return json({ id: 'e2e-c2', email: 'c2@gestiontextile.com', nom: 'C2', prenom: 'E2E', role: 'Administrateur', roleId: 1, estAdministrateur: true, estActif: true })
    }
    if (chemin === '/api/Permission/me') {
      return json(['dashboard', 'coupe', 'commandes'].map((module) => ({ module, canAccess: true, canWrite: true })))
    }
    if (chemin === '/api/ChaineProduction') {
      return json([{ id: 1, nom: 'Atelier interne', typeChaine: 'Confection', estSousTraitant: false, estActif: true, nombreEnvois: 0, nombreExports: 0 }])
    }
    if (chemin === '/api/OrdreCoupe/commande/1') {
      const o = ordreComplet(etat)
      return json([{ id: o.id, commandeId: 1, modele: o.modele, couleur: o.couleur, chaineProductionNom: null, nbTailles: o.tailles.length, nbPlans: o.plans.length, nbMatieres: o.matieres.length, totalCommande: o.totalCommande, totalPlanifie: o.totalPlanifie, alerteManque: o.alerteManque, verrouille: false, dateCreation: o.dateCreation }])
    }
    if (chemin === '/api/OrdreCoupe/1') {
      return json(ordreComplet(etat))
    }
    if (chemin === '/api/OrdreCoupe/1/plans' && route.request().method() === 'POST') {
      const corps = route.request().postDataJSON() as { plis: number; occurrences: { taille: string; occurrences: number }[] }
      etat.plans.push({ id: etat.prochainPlan++, index: etat.plans.length, libelle: null, plis: corps.plis, matelasId: null, matelasNumero: null, verrouille: false, occurrences: corps.occurrences ?? [] })
      return json({ message: 'Plan ajouté', id: etat.plans[etat.plans.length - 1].id })
    }
    const majPlan = chemin.match(/^\/api\/OrdreCoupe\/plans\/(\d+)$/)
    if (majPlan && route.request().method() === 'PUT') {
      const corps = route.request().postDataJSON() as { plis: number; occurrences: { taille: string; occurrences: number }[] }
      const plan = etat.plans.find((p) => p.id === Number(majPlan[1]))
      if (plan) {
        plan.plis = corps.plis
        plan.occurrences = corps.occurrences ?? []
      }
      return json({ message: 'Plan mis à jour' })
    }
    if (chemin === '/api/OrdreCoupe/1/Preremplir') {
      return json(ordreComplet(etat))
    }
    return json([])
  })
  await page.goto('/coupe/1/ordre-de-coupe', { waitUntil: 'domcontentloaded' })
}

test('l\'écran d\'ordre de coupe affiche les restes calculés, en rouge si négatifs', async ({ page }) => {
  await ouvrir(page, etatInitial())

  await expect(page.getByText(/Feuille d'ordre de coupe/)).toBeVisible()
  await expect(page.getByText('Commandé 15')).toBeVisible()
  await expect(page.getByText('Planifié 20', { exact: true })).toBeVisible()

  const ligneRestes = page.locator('tr', { hasText: 'Restes après plan 1' })
  await expect(ligneRestes).toBeVisible()
  const celluleNegative = ligneRestes.locator('td.text-red-600')
  await expect(celluleNegative).toHaveText('-10')
})

test('saisir un plan recalcule les restes et met le négatif en rouge', async ({ page }) => {
  const etat = etatInitial()
  await ouvrir(page, etat)

  await page.getByRole('button', { name: /Ajouter un plan/ }).click()
  await expect(page.getByText('Plan 2', { exact: true })).toBeVisible()

  const requeteMaj = page.waitForRequest((r) => /\/api\/OrdreCoupe\/plans\/\d+$/.test(r.url()) && r.method() === 'PUT')

  const occM = page.getByLabel('Occurrences M plan 2')
  await occM.fill('3')
  await occM.press('Enter')
  await requeteMaj

  const ligneRestes = page.locator('tr', { hasText: 'Restes après plan 2' })
  await expect(ligneRestes.locator('td.text-red-600')).toHaveText('-13')
})

test('l\'alerte tissu apparaît quand le stock restant est négatif', async ({ page }) => {
  await ouvrir(page, etatInitial())

  const ligneMatiere = page.locator('tr').filter({ has: page.getByLabel('Désignation Tissu jean') })
  await expect(ligneMatiere).toBeVisible()
  const stock = ligneMatiere.locator('td.text-red-600')
  await expect(stock).toContainText('-5')
  await expect(stock.locator('svg')).toBeVisible()
})
