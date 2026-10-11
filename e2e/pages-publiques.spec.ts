import { test, expect } from '@playwright/test'

// Pages publiques exigées par Google Auth Platform (> Branding) pour l'écran
// de consentement OAuth : une page d'accueil de l'application et des règles de
// confidentialité publiques. Tests face au BUILD DE PRODUCTION (next build +
// next start, jamais next dev), sans cookie de session, API interceptée.
//
// Ce qui est verrouillé :
//  - /a-propos, /confidentialite, /conditions répondent 200 sans redirection
//    vers /login, et contiennent le nom de l'application ;
//  - /confidentialite contient la mention d'« utilisation limitée » et un lien
//    de révocation myaccount.google.com/permissions ;
//  - /a-propos contient un lien vers /confidentialite ;
//  - /confidentialite/x et /a-propos-test (préfixes) redirigent vers /login ;
//  - /dashboard redirige toujours vers /login (non-régression) ;
//  - aucune requête /api/proxy n'est émise depuis ces pages ;
//  - aucun défilement horizontal à 1440 px comme à 375 px.

const NOM_APPLICATION = 'Système de Gestion Textile (SGT)'
const ROUTES_PUBLIQUES = ['/a-propos', '/confidentialite', '/conditions']

test.describe('Pages publiques (Google Branding)', () => {
  test('les trois pages répondent 200, sans redirection vers /login, et portent le nom de l\u2019application', async ({
    page,
  }) => {
    for (const chemin of ROUTES_PUBLIQUES) {
      const reponse = await page.goto(chemin)
      expect(reponse?.status(), `${chemin} doit répondre 200`).toBe(200)
      expect(page.url(), `${chemin} ne doit pas être redirigé vers /login`).not.toContain(
        '/login',
      )
      await expect(
        page.locator('body'),
        `${chemin} doit contenir le nom de l\u2019application`,
      ).toContainText(NOM_APPLICATION)
    }
  })

  test('/confidentialite : mention « utilisation limitée » et lien de révocation Google', async ({
    page,
  }) => {
    await page.goto('/confidentialite')
    await expect(page.locator('body')).toContainText('utilisation limitée')
    const lienRevocation = page.locator('a[href*="myaccount.google.com/permissions"]')
    await expect(lienRevocation).toHaveCount(1)
    await expect(lienRevocation).toBeVisible()
  })

  test('/a-propos : lien vers /confidentialite et liens de navigation publics', async ({
    page,
  }) => {
    await page.goto('/a-propos')
    await expect(page.locator('a[href="/confidentialite"]').first()).toBeVisible()
    await expect(page.locator('a[href="/conditions"]').first()).toBeVisible()
    expect(await page.locator('a[href="/login"]').count()).toBeGreaterThan(0)
  })

  test('/confidentialite/x et /a-propos-test redirigent vers /login (aucun préfixe public)', async ({
    page,
  }) => {
    await page.goto('/confidentialite/x')
    await expect(page).toHaveURL(/\/login/)

    await page.goto('/a-propos-test')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard redirige toujours vers /login (non-régression)', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('aucune requête vers /api/proxy n\u2019est émise depuis les pages publiques', async ({
    page,
  }) => {
    const requetes: string[] = []
    await page.route('**/api/**', async (route) => {
      requetes.push(new URL(route.request().url()).pathname)
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
    })
    for (const chemin of ROUTES_PUBLIQUES) {
      await page.goto(chemin)
    }
    expect(requetes, 'aucun appel API ne doit partir de ces pages').toEqual([])
  })

  test('aucun défilement horizontal à 1440 px ni à 375 px', async ({ page }) => {
    for (const largeur of [1440, 375]) {
      await page.setViewportSize({ width: largeur, height: largeur === 1440 ? 900 : 812 })
      for (const chemin of ROUTES_PUBLIQUES) {
        await page.goto(chemin)
        const sansDefilement = await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        )
        expect(
          sansDefilement,
          `défilement horizontal détecté sur ${chemin} à ${largeur} px`,
        ).toBe(true)
      }
    }
  })
})