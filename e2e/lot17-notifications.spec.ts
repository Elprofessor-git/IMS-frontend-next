import { test, expect, type Page, type Browser } from '@playwright/test'

// LOT 17 — la cloche couvre désormais les tâches (et les emails) sans changer de
// composant ni de page. Ce scénario joue le rôle du RECIPIENDAIRE : c'est la seule
// façon de prouver l'isolation, puisqu'une notification n'apparaît que dans la cloche
// de son destinataire.

const ADMIN = { email: 'admin@gestiontextile.com', password: 'Admin123!' }
const MOT_DE_PASSE = 'Lot17!2026'

type ApiResult = { status: number; data: unknown }

// Toutes les requêtes passent par le proxy Next (/api/proxy) : l'authentification
// vient du cookie httpOnly sgt_token posé lors du login UI.
async function api(page: Page, path: string, method = 'GET', body?: unknown): Promise<ApiResult> {
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

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 120_000 })
}

// Ouvre la cloche et attend le rafraîchissement du polling (25 s max + marge).
async function ouvrirCloche(page: Page) {
  await page.getByRole('button', { name: 'Notifications' }).click()
  await expect(page.getByTestId('notification-panel')).toBeVisible()
}

const CIBLE = {
  role: { path: '/api/roles' },
  register: { path: '/api/Auth/register' },
  tache: { path: '/api/TacheProduction' },
  notifications: { path: '/api/Notification' },
}

test('LOT 17 — la cloche notifie le responsable et le lien profond ouvre la tâche', async ({
  page,
  browser,
}: {
  page: Page
  browser: Browser
}) => {
  const ts = Date.now()
  const email = `e2e-lot17-${ts}@example.com`
  const titreTache = `LOT 17 tâche ${ts}`

  // ── Mise en place (session admin) ────────────────────────────────────────────
  await login(page, ADMIN.email, ADMIN.password)

  // Un rôle minimal : lecture des tâches + tableau de bord, RIEN d'autre. Le
  // destinataire ne doit voir que ce qu'il a le droit de voir.
  const roleRes = await api(page, CIBLE.role.path, 'POST', {
    name: `LOT 17 ${ts}`,
    description: 'Rôle éphémère du test E2E LOT 17 (cloche)',
    estAdministrateur: false,
    peutVoirTaches: true,
    peutVoirDashboard: true,
  })
  expect(roleRes.status).toBeLessThan(300)
  const roleId = (roleRes.data as { id: number }).id

  const registerRes = await api(page, CIBLE.register.path, 'POST', {
    nom: 'LOT17',
    prenom: 'Destinataire',
    email,
    password: MOT_DE_PASSE,
    roleId,
  })
  expect(registerRes.status).toBeLessThan(300)

  const usersRes = await api(page, '/api/Account/users')
  expect(usersRes.status).toBe(200)
  const destinataire = (usersRes.data as { id: string; email: string }[]).find(
    (u) => u.email.toLowerCase() === email,
  )
  expect(destinataire, 'le compte destinataire doit exister').toBeTruthy()

  // L'admin assigne la tâche : c'est cet événement qui doit réveiller la cloche.
  const tacheRes = await api(page, CIBLE.tache.path, 'POST', {
    titre: titreTache,
    description: 'Tâche de validation E2E LOT 17',
    assignedToUserId: destinataire!.id,
  })
  expect(tacheRes.status).toBe(201)
  const tacheId = (tacheRes.data as { id: number }).id

  try {
    // ── Isolation : l'auteur ne reçoit RIEN pour lui-même ─────────────────────
    const notifsAdmin = await api(page, `${CIBLE.notifications.path}/me`)
    expect(notifsAdmin.status).toBe(200)
    const notifsAdminBody = notifsAdmin.data as { notifications: { message: string }[] }
    expect(
      notifsAdminBody.notifications.some((n) => n.message.includes(titreTache)),
      "l'auteur ne doit pas être notifié de sa propre assignation",
    ).toBe(false)

    // ── Session du destinataire ────────────────────────────────────────────────
    const contexte = await browser.newContext()
    const pageDestinataire = await contexte.newPage()
    await login(pageDestinataire, email, MOT_DE_PASSE)

    await ouvrirCloche(pageDestinataire)
    const ligne = pageDestinataire.getByTestId('notification-list').getByText(titreTache).first()
    await expect(ligne, 'la notification doit apparaître dans la cloche').toBeVisible({ timeout: 40_000 })
    // L'origine est lisible sans ouvrir le message (icône + libellé), et le message
    // ne doit rien divulguer d'autre que le titre de la tâche.
    await expect(pageDestinataire.getByTestId('notification-list')).toContainText('Tâche assignée')
    await expect(pageDestinataire.getByTestId('notification-panel')).toContainText(titreTache)

    // ── Clic = lecture + navigation vers la tâche ──────────────────────────────
    await pageDestinataire.getByTestId('notification-list').getByText(titreTache).first().click()
    await pageDestinataire.waitForURL(`**/taches?taskId=${tacheId}`, { timeout: 30_000 })
    // Le tableau des tâches est rendu deux fois (mobile / desktop) : on cible la copie
    // visible, sinon `.first()` tombe sur la colonne masquée par `hidden sm:flex`.
    await expect(
      pageDestinataire.getByText(titreTache).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 30_000 })
    // Mise en avant du lien profond : la carte porte l'anneau d'accentuation.
    await expect(pageDestinataire.locator('div.ring-2.ring-primary').filter({ visible: true })).toHaveCount(1)

    // Marquée comme lue au clic : la pastille de non-lus disparaît.
    await expect
      .poll(
        async () => {
          const res = await api(pageDestinataire, `${CIBLE.notifications.path}/me`)
          const body = res.data as {
            notifications: { message: string; estLivree: boolean }[]
            countNonLivrees: number
          }
          const cible = body.notifications.find((n) => n.message.includes(titreTache))
          return cible ? cible.estLivree : null
        },
        { timeout: 30_000, message: 'la notification doit finir marquée comme lue' },
      )
      .toBe(true)

    // ── La ligne lue perd son fond accentué ───────────────────────────────────
    // Une notification lue reste visible (historique) : la cloche archive, elle
    // n'efface rien. « Aucune notification. » ne concerne que la liste vide.
    await ouvrirCloche(pageDestinataire)
    const ligneNotif = pageDestinataire
      .getByTestId('notification-list')
      .locator('button')
      .filter({ hasText: titreTache })
    await expect(ligneNotif).toBeVisible({ timeout: 30_000 })
    await expect(ligneNotif).toHaveClass(/border-border\/70/)

    // ── « Tout marquer lu » reste disponible s'il reste des non-lus ───────────
    const toutLu = pageDestinataire.getByRole('button', { name: /Tout marquer lu/ })
    if (await toutLu.isEnabled()) {
      await toutLu.click()
      await expect
        .poll(
          async () => {
            const res = await api(pageDestinataire, `${CIBLE.notifications.path}/me`)
            return (res.data as { countNonLivrees: number }).countNonLivrees
          },
          { timeout: 30_000, message: 'le compteur de non-lus doit repasser à zéro' },
        )
        .toBe(0)
    }

    await contexte.close()
  } finally {
    // ── Nettoyage : la base de développement ne garde aucune trace du test ────
    await api(page, `${CIBLE.tache.path}/${tacheId}`, 'DELETE')
    await api(page, `/api/Account/users/${destinataire!.id}`, 'DELETE')
    await api(page, `${CIBLE.role.path}/${roleId}`, 'DELETE')
  }
})

test('LOT 17 — /courriels?messageId= est consommé proprement (page sans Gmail connecté)', async ({
  page,
}) => {
  await login(page, ADMIN.email, ADMIN.password)

  await page.goto('/courriels?messageId=999999', { waitUntil: 'domcontentloaded' })
  // Le paramètre est validé puis retiré de l'URL : un identifiant inconnu ne doit
  // pas laisser la page dans un état cassé.
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe('/courriels')
  await expect(page.getByText('Courriels', { exact: true }).first()).toBeVisible({ timeout: 30_000 })

  // Un paramètre corrompu est ignoré, pas interprété.
  await page.goto('/courriels?messageId=abc', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Courriels', { exact: true }).first()).toBeVisible({ timeout: 30_000 })
  expect(new URL(page.url()).searchParams.get('messageId')).toBe('abc')
})
