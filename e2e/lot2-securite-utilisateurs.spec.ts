import { test, expect } from '@playwright/test'
import { setRole2, withFlags } from './lot2-perms.helper'

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:3000'
const EMAIL_NON_ADMIN = 'nonadmin@test.com'
const MDP_NON_ADMIN = 'NonAdmin123'

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL('**/dashboard')
}

test.beforeEach(async ({ request }) => {
  await setRole2(request, withFlags({ peutVoirUtilisateurs: true, peutGererUtilisateurs: true }))
})

test.afterEach(async ({ request }) => {
  await setRole2(request, withFlags())
})

test('C1 - un non-admin ne peut pas attribuer de rôle (UI)', async ({ page }) => {
  page.setViewportSize({ width: 375, height: 844 })
  await login(page, EMAIL_NON_ADMIN, MDP_NON_ADMIN)
  await page.goto(`${BASE}/utilisateurs`)
  await page.waitForSelector('table')

  await expect(page.locator('table select')).toHaveCount(0)
  await expect(page.getByText(/SansPlanning|—/i).first()).toBeVisible()

  await page.getByRole('button', { name: /ajouter un utilisateur/i }).click()
  await expect(page.getByLabel('Rôle personnalisé')).toBeDisabled()
  await expect(page.getByText(/réservée aux administrateurs/i)).toBeVisible()
  await page.screenshot({ path: 'e2e/lot2-securite-utilisateurs-nonadmin-375.png', fullPage: false })
})