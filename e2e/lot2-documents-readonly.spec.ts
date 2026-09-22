import { test, expect } from '@playwright/test'
import { setRole2, withFlags } from './lot2-perms.helper'

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:3000'
const EMAIL = 'nonadmin@test.com'
const MDP = 'NonAdmin123'

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Mot de passe').fill(MDP)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL('**/dashboard')
}

test.beforeEach(async ({ request }) => {
  await setRole2(request, withFlags({ peutGererAchats: true, peutConfirmerAchats: false }))
})

test.afterEach(async ({ request }) => {
  await setRole2(request, withFlags())
})

test('C2 - docs achat/importation : lecture seule (UI)', async ({ page }) => {
  page.setViewportSize({ width: 375, height: 844 })
  await login(page)

  await page.goto(`${BASE}/achats/1`)
  await page.getByRole('tab', { name: 'Documents' }).click()
  await page.getByText('Documents joints').waitFor({ timeout: 30000 })

  await expect(page.getByRole('button', { name: 'Ajouter', exact: true })).toHaveCount(0)
  await expect(page.getByTitle('Supprimer')).toHaveCount(0)
  await page.screenshot({ path: 'e2e/lot2-documents-readonly-achat-375.png', fullPage: false })
})