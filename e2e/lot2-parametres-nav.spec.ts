import { test, expect } from '@playwright/test'
import { setRole2, withFlags } from './lot2-perms.helper'

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:3000'

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL('**/dashboard')
}

test.beforeEach(async ({ request }) => {
  await setRole2(request, withFlags())
})

test.afterEach(async ({ request }) => {
  await setRole2(request, withFlags())
})

test('D - groupe Paramètres desktop (admin 1440px)', async ({ page }) => {
  page.setViewportSize({ width: 1440, height: 900 })
  await login(page, 'admin2@test.com', 'Admin2.123')
  await page.goto(`${BASE}/dashboard`)
  const groupe = page.getByText('Paramètres', { exact: true }).first()
  await expect(groupe).toBeVisible()
  await groupe.click()
  await expect(page.getByText('Utilisateurs').first()).toBeVisible()
  await expect(page.getByText('Rôles').first()).toBeVisible()
  await expect(page.getByText('Taux de change').first()).toBeVisible()
  await page.screenshot({ path: 'e2e/lot2-parametres-group-desktop-1440.png', fullPage: false })
})

test('D - groupe Paramètres drawer mobile (admin 375px)', async ({ page }) => {
  page.setViewportSize({ width: 375, height: 844 })
  await login(page, 'admin2@test.com', 'Admin2.123')
  await page.goto(`${BASE}/dashboard`)
  await page.getByRole('button', { name: /ouvrir le menu/i }).click()
  const sheet = page.getByRole('dialog')
  const groupe = sheet.getByText('Paramètres', { exact: true })
  await expect(groupe).toBeVisible()
  await groupe.click()
  await expect(sheet.getByText('Utilisateurs').first()).toBeVisible()
  await page.screenshot({ path: 'e2e/lot2-parametres-group-mobile-375.png', fullPage: false })
})

test('D - groupe Paramètres masqué pour un non-admin', async ({ page }) => {
  page.setViewportSize({ width: 1440, height: 900 })
  await login(page, 'nonadmin@test.com', 'NonAdmin123')
  await page.goto(`${BASE}/dashboard`)
  await expect(page.getByText('Paramètres', { exact: true })).toHaveCount(0)
})