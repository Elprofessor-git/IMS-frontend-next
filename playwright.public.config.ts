import { defineConfig } from '@playwright/test'

// Jeu de tests des pages publiques (Google Branding) face au BUILD DE PRODUCTION :
// le serveur est `next start` (production), jamais `next dev`. Exiger un `pnpm build`
// avant d'exécuter `pnpm exec playwright test -c playwright.public.config.ts`.

export default defineConfig({
  testDir: './e2e',
  testMatch: 'pages-publiques.spec.ts',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  expect: { timeout: 15_000 },
  webServer: {
    command: 'pnpm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})