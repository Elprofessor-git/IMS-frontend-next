import { test, expect, type Page, type Locator } from '@playwright/test'

// LOT CALCULATRICE — widget flottant déplaçable.
//
// Ces tests pilotent l'INTERFACE : toutes les réponses d'API sont interceptées
// (page.route) et la session est un jeton fabriqué. Aucune base, aucun serveur,
// aucun appel externe.
//
// Ce qu'ils verrouillent, c'est le comportement qui manquait avant ce lot :
//
//   1. le BOUTON flottant suit le pointeur, et un glissement n'ouvre pas le panneau
//      (seuil de 8 px) — sinon tout déplacement de l'icône ouvrait la calculatrice ;
//   2. le PANNEAU se déplace par SA BARRE DE TITRE seulement : cliquer une touche
//      ne déplace pas le panneau, sinon la saisie devient impraticable ;
//   3. les deux restent dans la fenêtre, y compris après un redimensionnement ;
//   4. la fermeture par la croix fonctionne — c'est le piège du `setPointerCapture`
//      installé sur le panneau, qui reroute le `click` du bouton vers le panneau.

const JETON = [
  btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  btoa(
    JSON.stringify({
      sub: 'e2e-calculatrice',
      unique_name: 'Calculatrice E2E',
      email: 'calculatrice@gestiontextile.com',
      role: 'Administrateur',
      plateformId: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ),
  'signature-bidon',
].join('.')

const DESKTOP = { width: 1280, height: 800 }
const MOBILE = { width: 390, height: 844 }

async function ouvrirTableauDeBord(page: Page) {
  await page.context().addCookies([
    { name: 'sgt_token', value: JETON, url: 'http://localhost:3000' },
  ])
  // L'application passe par un préfixe de relais ; le retirer pour ne raisonner que sur
  // les vrais endpoints. Le reste reçoit `[]` : listes vides plausibles.
  await page.route('**/api/**', async (route) => {
    const chemin = new URL(route.request().url()).pathname.replace(/^\/api\/proxy/, '')
    if (chemin === '/api/Auth/me') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'e2e-calculatrice',
          email: 'calculatrice@gestiontextile.com',
          nom: 'Calculatrice',
          prenom: 'E2E',
          role: 'Administrateur',
          roleId: 1,
          estAdministrateur: true,
          estActif: true,
        }),
      })
    }
    if (chemin === '/api/Permission/me') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          ['dashboard', 'production', 'stock'].map((module) => ({
            module,
            canAccess: true,
            canWrite: true,
          })),
        ),
      })
    }
    // Le tableau de bord appelle `avancementMoyen.toFixed(0)` sans garde : laissée à `[]`,
    // la page part dans le `error.tsx` et la calculatrice n'est jamais montée. Il faut
    // donc servir la forme EXACTE de `TacheDashboard`.
    if (chemin === '/api/TacheProduction/Dashboard') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalTaches: 0,
          nonCommencees: 0,
          enCours: 0,
          bloquees: 0,
          terminees: 0,
          tachesUrgentes: 0,
          tachesEnRetard: 0,
          avancementMoyen: 0,
          peutVoirToutesLesTaches: true,
        }),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  // `domcontentloaded` et non `load` : en dev, `/dashboard` compile à la demande et le
  // chargement complet peut dépasser le délai du test sans que rien ne soit cassé.
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
}

const bouton = (page: Page) => page.getByRole('button', { name: /calculatrice/i })
const panneau = (page: Page) => page.locator('[data-calculator-panel]')
const barreDeTitre = (page: Page) => panneau(page).locator('[data-drag-handle]')

/**
 * Glisse un élément d'un vecteur donné, en partant de son centre.
 *
 * Les assertions doivent porter sur un DELTA entre deux `boundingBox()`, jamais sur une
 * coordonnée absolue visée : le centre de la barre de titre d'un panneau large se trouve
 * à sa moitié, si bien qu'un « se déplacer vers x+150 » revient en réalité à un
 * déplacement NEGATIF de plusieurs dizaines de pixels, et se retrouve écrêté à 0 par
 * le clamp.
 */
async function glisser(page: Page, cible: Locator, dx: number, dy: number) {
  const box = await cible.boundingBox()
  if (!box) throw new Error('élément absent de l\'écran')
  const departX = box.x + box.width / 2
  const departY = box.y + box.height / 2
  await page.mouse.move(departX, departY)
  await page.mouse.down()
  await page.mouse.move(departX + dx, departY + dy, { steps: 12 })
  await page.mouse.up()
  return box
}

/**
 * Position de l'élément une fois le déplacement TERMINÉ.
 *
 * Le `Button` de shadcn porte `transition-all`, qui anime donc aussi `left` et `top` :
 * lire la boîte immédiatement après `mouse.up()` mesure l'élément en plein trajet et
 * l'écart au vecteur demandé vaut une dizaine de pixels — un artefact de l'animation, pas
 * un défaut de placement. On attend donc la stabilisation.
 */
async function positionStable(cible: Locator) {
  let precedente = await cible.boundingBox()
  for (let essai = 0; essai < 80; essai++) {
    await cible.page().waitForTimeout(50)
    const courante = await cible.boundingBox()
    if (!courante || !precedente) return courante ?? precedente!
    if (Math.abs(courante.x - precedente.x) < 0.5 && Math.abs(courante.y - precedente.y) < 0.5) {
      return courante
    }
    precedente = courante
  }
  return precedente!
}

/**
 * Égalité à ±1 px.
 *
 * `boundingBox()` rend des sous-pixels (`752.007` là où le CSS dit `752`) : sans marge,
 * l'assertion échoue sur l'arrondi de l'affichage, pas sur un défaut du composant.
 */
function expectPresqueEgal(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1)
}

test.describe('Calculatrice — widget flottant déplaçable', () => {
  test('le bouton flottant suit le pointeur et un clic l’ouvre', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await ouvrirTableauDeBord(page)

    const icone = bouton(page)
    await expect(icone).toBeVisible()

    const avant = await glisser(page, icone, 220, 130)
    const apres = await positionStable(icone)

    // Le déplacement observé vaut le déplacement demandé, à un pixel près.
    expectPresqueEgal(apres.x - avant.x, 220)
    expectPresqueEgal(apres.y - avant.y, 130)

    // Le glissement n'a PAS ouvert le panneau : c'est le seuil de 8 px qui sépare
    // les deux gestes.
    await expect(panneau(page)).toHaveCount(0)

    // Un clic, lui, l'ouvre.
    await icone.click()
    await expect(panneau(page)).toBeVisible()
  })

  test('le bouton flottant est ramené dans la fenêtre après un redimensionnement', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await ouvrirTableauDeBord(page)

    const icone = bouton(page)
    await expect(icone).toBeVisible()
    await glisser(page, icone, 400, 300)

    // Fenêtre rétrécie : l'icône ne doit pas rester hors du viewport.
    await page.setViewportSize(MOBILE)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[aria-label*="alculatrice"]')
        if (!el) return false
        const r = el.getBoundingClientRect()
        return r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1
      },
      undefined,
      { timeout: 10_000 },
    )

    const apres = (await icone.boundingBox())!
    expect(apres.x).toBeGreaterThanOrEqual(0)
    expect(apres.y).toBeGreaterThanOrEqual(0)
    expect(apres.x + apres.width).toBeLessThanOrEqual(MOBILE.width)
    expect(apres.y + apres.height).toBeLessThanOrEqual(MOBILE.height)
  })

  test('le panneau se déplace par sa barre de titre seulement', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await ouvrirTableauDeBord(page)

    await bouton(page).click()
    const panneauCalc = panneau(page)
    await expect(panneauCalc).toBeVisible()

    // Vers la DROITE : le panneau démarre à x=16, un déplacement vers la gauche serait
    // absorbé par le clamp et l'assertion ne testerait plus que lui.
    const avant = await glisser(page, barreDeTitre(page), 180, 120)
    const apres = await positionStable(panneauCalc)
    expectPresqueEgal(apres.x - avant.x, 180)
    expectPresqueEgal(apres.y - avant.y, 120)

    // Cliquer une touche saisit, ça ne déplace pas le panneau.
    const positionApresGlissement = { x: apres.x, y: apres.y }
    await panneauCalc.getByRole('button', { name: '7', exact: true }).click()
    await panneauCalc.getByRole('button', { name: '+', exact: true }).click()
    await panneauCalc.getByRole('button', { name: '5', exact: true }).click()
    const apresClic = await positionStable(panneauCalc)
    expectPresqueEgal(apresClic.x, positionApresGlissement.x)
    expectPresqueEgal(apresClic.y, positionApresGlissement.y)

    // Le calcul a bien été saisi.
    await expect(panneauCalc.getByLabel('Expression à calculer')).toHaveValue('7+5')
    await panneauCalc.getByRole('button', { name: '=', exact: true }).click()
    await expect(panneauCalc.getByText('12', { exact: true })).toBeVisible()
  })

  test('la croix ferme le panneau', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await ouvrirTableauDeBord(page)

    await bouton(page).click()
    const panneauCalc = panneau(page)
    await expect(panneauCalc).toBeVisible()

    await panneauCalc.getByRole('button', { name: 'Fermer la calculatrice' }).click()
    await expect(panneauCalc).toHaveCount(0)

    // Le bouton flottant reste, et rouvre.
    await expect(bouton(page)).toBeVisible()
    await bouton(page).click()
    await expect(panneauCalc).toBeVisible()
  })

  test('bouton et panneau se déplacent en vue mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await ouvrirTableauDeBord(page)

    const icone = bouton(page)
    await expect(icone).toBeVisible()
    const avantBouton = await glisser(page, icone, 90, 200)
    const apresBouton = await positionStable(icone)
    expectPresqueEgal(apresBouton.x - avantBouton.x, 90)
    expectPresqueEgal(apresBouton.y - avantBouton.y, 200)
    expect(apresBouton.x + apresBouton.width).toBeLessThanOrEqual(MOBILE.width)
    expect(apresBouton.y + apresBouton.height).toBeLessThanOrEqual(MOBILE.height)

    await icone.click()
    const panneauCalc = panneau(page)
    await expect(panneauCalc).toBeVisible()

    const avantPanneau = await glisser(page, barreDeTitre(page), 0, 140)
    const apresPanneau = await positionStable(panneauCalc)
    expectPresqueEgal(apresPanneau.y - avantPanneau.y, 140)
    expect(apresPanneau.x).toBeGreaterThanOrEqual(0)
    expect(apresPanneau.x + apresPanneau.width).toBeLessThanOrEqual(MOBILE.width)
    expect(apresPanneau.y + apresPanneau.height).toBeLessThanOrEqual(MOBILE.height)
  })

  test('un glissement vers le bord est écrêté, pas perdu', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await ouvrirTableauDeBord(page)

    const icone = bouton(page)
    await expect(icone).toBeVisible()

    // Loin au-delà du bord droit et bas : l'icône se colle au bord, elle ne disparaît pas.
    await glisser(page, icone, 5000, 5000)
    const apres = await positionStable(icone)
    expectPresqueEgal(apres.x, DESKTOP.width - apres.width)
    expectPresqueEgal(apres.y, DESKTOP.height - apres.height)
  })
})
