import { test, expect, type Page } from '@playwright/test'

const BASE = 'http://localhost:3000'

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 30_000 })
}

test.describe('HOTFIX LOT 1 — planning + notifications', () => {
  test('ADMIN 1440px : menu Planning visible, grille, nav semaines, chaînes, cloche, F5', async ({
    page,
  }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, 'admin@gestiontextile.com', 'Admin123!')

    // A1 : le module planning est visible (avant : menu absent puis disparition)
    const planLink = page.getByRole('link', { name: 'Planning' })
    await expect(planLink).toBeVisible({ timeout: 20_000 })
    await planLink.click()
    await page.waitForURL('**/planning')

    // B5 : la grille charge (plus de « filter is not a function ») — chaîne + cellule
    await expect(page.getByText('Chaine Test HTTP')).toBeVisible({ timeout: 25_000 })
    await expect(page.getByText('79-PO-TEST-001')).toBeVisible()

    // C2 : navigation par semaines — le date input avance de +7 jours
    const dateInput = page.getByLabel('Date de départ des semaines')
    await expect(dateInput).toBeVisible()
    const d0 = await dateInput.inputValue()
    await page.getByRole('button', { name: /Semaine suiv/i }).click()
    const d1 = await dateInput.inputValue()
    expect(new Date(d1).getTime() - new Date(d0).getTime()).toBe(7 * 86_400_000)
    await page.getByRole('button', { name: /Semaine préc/i }).click()
    expect(await dateInput.inputValue()).toBe(d0)

    // C2 : « Gérer les chaînes » — créer une chaîne, elle apparaît dans la grille
    await page.getByRole('button', { name: 'Gérer les chaînes' }).click()
    await page.getByLabel('Nom').fill('Chaine Playwright')
    await page.getByRole('button', { name: 'Ajouter la chaîne' }).click()
    await expect(page.getByText('Chaine Playwright').first()).toBeVisible({ timeout: 25_000 })
    await page.getByRole('button', { name: 'Fermer', exact: true }).last().click()
    // la chaîne créée apparaît comme ligne de la grille (C2)
    await expect(
      page.locator('th').filter({ hasText: 'Chaine Playwright' }),
    ).toBeVisible({ timeout: 25_000 })

    // B4/B5 : la cloche affiche la notification planning (titre→message, date→dateNotification)
    await page.getByRole('button', { name: 'Notifications' }).click()
    await expect(page.getByText('79-PO-TEST-001', { exact: false }).first()).toBeVisible({
      timeout: 25_000,
    })
    await expect(page.getByText(/Le planning a changé/).first()).toBeVisible()
    await page.screenshot({ path: 'e2e/lot1-admin-1440.png', fullPage: true })
    await page.keyboard.press('Escape')

    // F5 : rechargement, l'entrée persiste côté front
    await page.reload()
    await expect(page.getByText('79-PO-TEST-001')).toBeVisible({ timeout: 25_000 })
  })

  test('NON-ADMIN 375px : Planning absent du drawer, /planning direct sans crash', async ({
    page,
  }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page, 'nonadmin@test.com', 'NonAdmin123')

    // A1 côté UI : le drawer mobile (375px) ne propose pas Planning pour un compte non privilégié.
    // Le rôle de test n'a QUE PeutVoirMouvements → on s'appuie sur « Mouvements » comme repère visible.
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
    await expect(page.getByRole('link', { name: 'Mouvements' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: 'Planning' })).toHaveCount(0)
    await page.screenshot({ path: 'e2e/lot1-nonadmin-375-menu.png', fullPage: true })
    await page.getByRole('button', { name: 'Fermer' }).click()

    // Navigation directe vers /planning : pas de crash JS type « filter is not a function »
    await page.goto(`${BASE}/planning`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Planning de production')).toBeVisible({ timeout: 30_000 })
    const body = await page.textContent('body')
    expect(body).not.toContain('filter is not a function')
    expect(body).not.toContain('Application error')
    await page.screenshot({ path: 'e2e/lot1-nonadmin-375-planning.png', fullPage: true })
  })

  test('CROSS-ACCOUNT : un changement par admin2 apparaît dans la cloche d\'admin (polling)', async ({
    browser,
  }) => {
    test.setTimeout(240_000)
    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await login(pageA, 'admin@gestiontextile.com', 'Admin123!')
    await login(pageB, 'admin2@test.com', 'Admin2.123')

    // A ouvre la cloche, B modifie le planning (autre compte)
    await pageA.goto(`${BASE}/planning`)
    await expect(pageA.getByText('Chaine Test HTTP')).toBeVisible({ timeout: 25_000 })
    await pageA.getByRole('button', { name: 'Notifications' }).click()

    await pageB.goto(`${BASE}/planning`)
    await expect(pageB.getByText('Chaine Test HTTP')).toBeVisible({ timeout: 25_000 })
    // B crée une cellule sur une case vide (premier samedi, première chaîne)
    await pageB.locator('button[title="Planifier une commande"]').first().click()
    await pageB.getByLabel('Numéro de commande').fill('79-PO-CROSS-002')
    await pageB.getByRole('button', { name: 'Planifier' }).click()
    await expect(pageB.getByText('79-PO-CROSS-002')).toBeVisible({ timeout: 25_000 })

    // B5/B6 : dans la cloche d'A (polling 25 s + refocus) la nouvelle notification apparaît
    await expect(pageA.getByText('79-PO-CROSS-002', { exact: false }).first()).toBeVisible({
      timeout: 60_000,
    })
    await pageA.screenshot({ path: 'e2e/lot1-crossaccount-bell.png', fullPage: true })

    await ctxA.close()
    await ctxB.close()
  })
})