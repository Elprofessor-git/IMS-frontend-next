import { test, expect } from '@playwright/test'

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

async function ouvrir(page: any, commandeId: number = 1) {
  await page.context().addCookies([
    { name: 'sgt_token', value: JETON, url: 'http://localhost:3000' },
  ])
  await page.route('**/api/**', async (route: any) => {
    const chemin = new URL(route.request().url()).pathname.replace(/^\/api\/proxy/, '')
    if (chemin === '/api/Auth/me') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'e2e-c2',
          email: 'c2@gestiontextile.com',
          nom: 'C2',
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
        body: JSON.stringify(['dashboard','coupe','commandes'].map((module) => ({module,canAccess:true,canWrite:true}))),
      })
    }
    if (chemin === '/api/Commandes') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    if (chemin === `/api/RapportCoupe/${commandeId}/OrdreDeCoupe`) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        commandeId,
        numeroCommande: 'CMD-001',
        margeSecuriteDefaut: 5,
        totalPlanTheorique: 100,
        totalCoupeReelle: 0,
        totalCoupesSansMatelas: 0,
        matelas: [],
        tailles: [],
      }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.goto(`/coupe/${commandeId}`, { waitUntil: 'domcontentloaded' })
}

test('ordre de coupe: écran accessible avec permission coupe', async ({ page }: any) => {
  await ouvrir(page)
  await expect(page.getByText('Ordre de coupe')).toBeVisible()
})
