import { test, expect, type Page } from '@playwright/test'

// LOT 18 (PHASE E) — module Discussion, étape frontend.
//
// Toutes les réponses d'API sont INTERCEPTÉES (page.route) : ces tests pilotent
// l'interface et le transport, sans base ni serveur. Le contrôle des droits côté
// serveur est déjà couvert par les tests d'intégration backend (DiscussionTests).
//
// Ce que ces tests verrouillent :
// - l'envoi (Entrée envoie, Maj+Entrée = retour à la ligne, texte optimiste) ;
// - la réception par polling du flux /sync ;
// - le badge de non-lus de la topbar, qui disparaît à l'ouverture ;
// - l'adaptation mobile (liste puis conversation, bouton retour) ;
// - l'absence totale du module sans le drapeau.

const JETON = [
  btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  btoa(
    JSON.stringify({
      sub: 'moi-id',
      unique_name: 'Moi Meme',
      email: 'moi@gestiontextile.com',
      role: 'Admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ),
  'signature-bidon',
].join('.')

const MOI = 'moi-id'
const AUTRE = 'collegue-id'

type Conversation = {
  id: number
  type: 'Direct' | 'Groupe' | 'Canal'
  nom: string | null
  estPrive: boolean
  estAdmin: boolean
  creeLe: string
  archiveLe: string | null
  nonLus: number
  dernierMessageLe: string | null
  dernierMessageApercu: string | null
  membres: {
    userId: string
    nomAffichage: string
    estAdmin: boolean
    muet: boolean
    rejointLe: string
    aQuitteLe: string | null
  }[]
}

type Message = {
  id: number
  conversationId: number
  auteurUserId: string
  auteurNom: string
  contenu: string
  envoyeLe: string
  modifieLe: string | null
  estSupprime: boolean
  reponseAId: number | null
  revision: number
}

const MEMBRES = [
  { userId: MOI, nomAffichage: 'Moi Meme', estAdmin: true, muet: false, rejointLe: '2026-10-10T09:00:00', aQuitteLe: null },
  { userId: AUTRE, nomAffichage: 'Collegue Test', estAdmin: true, muet: false, rejointLe: '2026-10-10T09:00:00', aQuitteLe: null },
]

function conversationDirect(nonLus = 0): Conversation {
  return {
    id: 1,
    type: 'Direct',
    nom: null,
    estPrive: true,
    estAdmin: true,
    creeLe: '2026-10-10T09:00:00',
    archiveLe: null,
    nonLus,
    dernierMessageLe: '2026-10-10T09:05:00',
    dernierMessageApercu: 'Bonjour',
    membres: MEMBRES,
  }
}

function message(partial: Partial<Message> & Pick<Message, 'id' | 'contenu' | 'auteurUserId' | 'auteurNom'>): Message {
  return {
    conversationId: 1,
    envoyeLe: '2026-10-10T09:05:00',
    modifieLe: null,
    estSupprime: false,
    reponseAId: null,
    revision: partial.id,
    ...partial,
  } as Message
}

type Options = {
  sansDrapeau?: boolean
  conversation?: Conversation
  /** Messages du flux /sync selon le numéro d'appel (1 = premier appel). */
  syncMessages?: (appel: number) => Message[]
  historique?: Message[]
  utilisateurs?: { userId: string; nom: string; prenom: string; poste: string | null; nomAffichage: string }[]
}

/**
 * Installe le harnais : jeton, interception de TOUTES les routes /api, et renvoie
 * les tableaux d'observation (envois de messages, créations de conversation).
 */
async function installer(page: Page, options: Options = {}) {
  const envois: Record<string, unknown>[] = []
  const crees: Record<string, unknown>[] = []
  const lus: { id: number; jusquaMessageId: number }[] 
    = []
  const conversation = options.conversation ?? conversationDirect(0)
  let appelSync = 0
  // Une fois la conversation marquée lue, le serveur renverrait nonLus = 0 :
  // on simule cette persistance pour que la pastille ne réapparaisse pas.
  let lue = false

  await page.context().addCookies([
    { name: 'sgt_token', value: JETON, url: 'http://localhost:3000' },
  ])
  await page.unroute('**/api/**')

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const chemin = url.pathname.replace(/^\/api\/proxy/, '')
    const methode = route.request().method()
    const json = (corps: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corps) })
    const vide = () => route.fulfill({ status: 204, body: '' })

    if (chemin === '/api/Auth/me') {
      return json({
        id: MOI,
        email: 'moi@gestiontextile.com',
        nom: 'Meme',
        prenom: 'Moi',
        role: 'Administrateur',
        roleId: 1,
        estAdministrateur: true,
        estActif: true,
      })
    }

    if (chemin === '/api/Permission/me') {
      if (options.sansDrapeau) {
        return json([{ module: 'dashboard', canAccess: true, canWrite: false }])
      }
      return json([
        { module: 'dashboard', canAccess: true, canWrite: false, peutUtiliserDiscussion: true, peutGererDiscussion: true },
        { module: 'discussion', canAccess: true, canWrite: false, peutUtiliserDiscussion: true, peutGererDiscussion: true },
      ])
    }

    if (chemin === '/api/Notification/me') {
      return json({ notifications: [], countNonLivrees: 0 })
    }

    if (chemin === '/api/Discussion/sync') {
      appelSync += 1
      const messages = options.syncMessages ? options.syncMessages(appelSync) : []
      const snapshot = lue ? { ...conversation, nonLus: 0 } : conversation
      return json({ curseur: appelSync, messages, conversations: [snapshot] })
    }

    if (chemin === '/api/Discussion/utilisateurs') {
      return json(
        options.utilisateurs ?? [
          { userId: AUTRE, nom: 'Test', prenom: 'Collegue', poste: 'Coupe', nomAffichage: 'Collegue Test' },
        ],
      )
    }

    if (chemin === '/api/Discussion' && methode === 'POST') {
      const corps = route.request().postDataJSON() as Record<string, unknown>
      crees.push(corps)
      return json({ ...conversationDirect(0), id: 42, nom: (corps.nom as string) ?? null }, 201)
    }

    if (chemin === '/api/Discussion' || chemin === `/api/Discussion/${conversation.id}`) {
      return json([conversation])
    }

    const lireMatch = chemin.match(/^\/api\/Discussion\/(\d+)\/lire$/)
    if (lireMatch) {
      const corps = route.request().postDataJSON() as { jusquaMessageId: number }
      lus.push({ id: Number(lireMatch[1]), jusquaMessageId: corps.jusquaMessageId })
      lue = true
      return vide()
    }

    const messagesMatch = chemin.match(/^\/api\/Discussion\/(\d+)\/messages$/)
    if (messagesMatch) {
      if (methode === 'POST') {
        const corps = route.request().postDataJSON() as { contenu: string }
        envois.push(corps)
        return json(
          message({
            id: 99,
            contenu: corps.contenu,
            auteurUserId: MOI,
            auteurNom: 'Meme Moi',
            revision: 99,
          }),
          201,
        )
      }
      return json(options.historique ?? [])
    }

    // Le reste (cloche, planning, etc.) : réponses vides plausibles.
    return json([])
  })

  return { envois, crees, lus }
}

test.describe('LOT 18 — Discussion (E2)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (e) => console.error('ERREUR DE RENDU :', e.message))
  })

  test('Entrée envoie ; Maj+Entrée insère un retour à la ligne', async ({ page }) => {
    const { envois } = await installer(page, {
      historique: [message({ id: 1, contenu: 'Bonjour', auteurUserId: AUTRE, auteurNom: 'Collegue Test' })],
    })
    await page.goto('/discussion', { waitUntil: 'domcontentloaded' })
    await page.getByTestId(`conversation-1`).click()

    const champ = page.getByTestId('discussion-composer-input')
    await expect(champ).toBeVisible()

    // Maj+Entrée : le texte grandit, rien n'est envoyé.
    await champ.click()
    await champ.type('Ligne 1')
    await champ.press('Shift+Enter')
    await champ.type('Ligne 2')
    await expect(champ).toHaveValue('Ligne 1\nLigne 2')
    expect(envois.length).toBe(0)

    // Entrée : envoi, texte vidé une fois parti.
    await champ.press('Enter')
    await expect.poll(() => envois.length, { timeout: 15_000 }).toBe(1)
    expect(envois[0].contenu).toBe('Ligne 1\nLigne 2')
    await expect(champ).toHaveValue('')
  })

  test('un message arrive par polling sans recharger la page', async ({ page }) => {
    const flux = message({
      id: 7,
      contenu: 'Message reçu par polling',
      auteurUserId: AUTRE,
      auteurNom: 'Collegue Test',
      revision: 7,
    })
    await installer(page, {
      historique: [],
      // Le premier appel est vide, les suivants livrent le message : c'est le
      // polling (3 s page ouverte) qui doit le faire apparaître.
      syncMessages: (appel) => (appel >= 2 ? [flux] : []),
    })
    await page.goto('/discussion', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('conversation-1').click()

    await expect(
      page.getByTestId('discussion-messages').getByText('Message reçu par polling'),
    ).toBeVisible({ timeout: 20_000 })
  })

  test('le badge de non-lus disparaît à l’ouverture de la conversation', async ({ page }) => {
    await installer(page, {
      conversation: conversationDirect(3),
      historique: [
        message({ id: 1, contenu: 'Déjà lu', auteurUserId: AUTRE, auteurNom: 'Collegue Test' }),
        message({ id: 2, contenu: 'Non lu 1', auteurUserId: AUTRE, auteurNom: 'Collegue Test' }),
        message({ id: 3, contenu: 'Non lu 2', auteurUserId: AUTRE, auteurNom: 'Collegue Test' }),
      ],
    })
    await page.goto('/discussion', { waitUntil: 'domcontentloaded' })

    // Badge global de la topbar : 3 non-lus.
    await expect(page.getByTestId('discussion-badge')).toHaveText('3')

    await page.getByTestId('conversation-1').click()

    // Ouverture = marquage lu → la pastille globale disparaît (optimiste puis serveur).
    await expect(page.getByTestId('discussion-badge')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByTestId('non-lus-1')).toHaveCount(0)
  })

  test('mobile : la liste ouvre le détail, le bouton retour ramène à la liste', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await installer(page, {
      historique: [message({ id: 1, contenu: 'Bonjour', auteurUserId: AUTRE, auteurNom: 'Collegue Test' })],
    })
    await page.goto('/discussion', { waitUntil: 'domcontentloaded' })

    const liste = page.getByTestId('conversation-1')
    await expect(liste).toBeVisible()

    // Le composeur est masqué tant que la conversation n'est pas ouverte.
    await expect(page.getByTestId('discussion-composer')).toHaveCount(0)

    await liste.click()
    await expect(page.getByTestId('discussion-composer')).toBeVisible()
    await expect(liste).toBeHidden()

    await page.getByRole('button', { name: 'Retour à la liste' }).click()
    await expect(page.getByTestId('conversation-1')).toBeVisible()
    await expect(page.getByTestId('discussion-composer')).toBeHidden()
  })

  test('sans le drapeau, la page Discussion et la cloche sont absentes', async ({ page }) => {
    await installer(page, { sansDrapeau: true })
    await page.goto('/discussion', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Accès refusé : module « Discussion » non autorisé')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId('discussion-nouveau')).toHaveCount(0)
    await expect(page.getByTestId('discussion-composer')).toHaveCount(0)
    await expect(page.getByTestId('discussion-bell')).toHaveCount(0)
  })
})
