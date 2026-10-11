import { test, expect, type Page } from '@playwright/test'

// LOT 20 (PHASE E) — discussions CONTEXTUELLES (E3), étape frontend.
//
// Une conversation est rattachée à un objet métier (tâche, commande, OF, achat) et
// s'ouvre depuis sa fiche. Le backend — qui décide seul des droits — est ici remplacé
// par des routes interceptées : on verrouille l'interface et le transport.
//
// Ce que ces tests couvrent :
// - l'ouverture idempotente (POST /api/Discussion/contexte/{segment}/{id}) et
//   l'affichage des messages ;
// - le rendu des cartes de références, calculées pour le lecteur (montant absent
//   sans droit d'écriture) ;
// - l'état 403 : la discussion d'un objet inaccessible est annoncée, pas subie ;
// - la notification de mention : icône dédiée et route vers /discussion.

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
  type: 'Direct' | 'Groupe' | 'Canal' | 'Contexte'
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

type Reference = {
  type: 'Commande' | 'OrdreFabrication' | 'TacheProduction' | 'Achat'
  reference: string
  id: number
  libelle: string
  statut: string | null
  date: string | null
  montant: number | null
  devise: string | null
  tiers: string | null
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
  references?: Reference[]
}

function tache(id: number, titre: string) {
  return {
    id,
    titre,
    statut: 1,
    priorite: 1,
    dateCreation: '2026-10-10T09:00:00',
    dureeEstimeeHeures: 0,
    dureeReelleHeures: 0,
    pourcentageAvancement: 20,
  }
}

function conversationContexte(): Conversation {
  return {
    id: 7,
    type: 'Contexte',
    nom: 'Tâche — Coupe panneau',
    estPrive: true,
    estAdmin: true,
    creeLe: '2026-10-10T09:00:00',
    archiveLe: null,
    nonLus: 0,
    dernierMessageLe: '2026-10-10T09:05:00',
    dernierMessageApercu: null,
    membres: [
      { userId: MOI, nomAffichage: 'Moi Meme', estAdmin: true, muet: false, rejointLe: '2026-10-10T09:00:00', aQuitteLe: null },
    ],
  }
}

function message(partial: Partial<Message> & Pick<Message, 'id' | 'contenu' | 'auteurUserId' | 'auteurNom'>): Message {
  return {
    conversationId: 7,
    envoyeLe: '2026-10-10T09:05:00',
    modifieLe: null,
    estSupprime: false,
    reponseAId: null,
    revision: partial.id,
    ...partial,
  }
}

type Options = {
  /** POST /contexte/... renvoie 403 au lieu de la conversation (droit module absent). */
  contexteInterdit?: boolean
  historique?: Message[]
  /** Notification renvoyée par la cloche (défaut : aucune). */
  notifications?: Record<string, unknown>[]
  /** Suggestions d'autocomplétion renvoyées par GET /references?q=… */
  suggestions?: Record<string, unknown>[]
}

/**
 * Harnais minimal centré sur la page Tâches (une carte = un point d'entrée Discussion).
 * Renvoie les observations pour assertion sur le transport.
 */
async function installer(page: Page, options: Options = {}) {
  const contextesOuverts: string[] = []
  const envois: { contenu: string }[] = []

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
      return json([
        { module: 'dashboard', canAccess: true, canWrite: false, peutUtiliserDiscussion: true, peutGererDiscussion: true },
        { module: 'taches', canAccess: true, canWrite: true },
        { module: 'discussion', canAccess: true, canWrite: false, peutUtiliserDiscussion: true, peutGererDiscussion: true },
      ])
    }

    if (chemin === '/api/Notification/me') {
      return json({ notifications: options.notifications ?? [], countNonLivrees: (options.notifications ?? []).length })
    }

    if (/^\/api\/Notification\/\d+\/livrer$/.test(chemin)) return vide()

    if (chemin === '/api/TacheProduction/Dashboard') {
      return json({
        totalTaches: 1,
        nonCommencees: 0,
        enCours: 1,
        bloquees: 0,
        terminees: 0,
        tachesUrgentes: 0,
        tachesEnRetard: 0,
        avancementMoyen: 20,
        peutVoirToutesLesTaches: false,
      })
    }

    if (chemin === '/api/TacheProduction') {
      return json([tache(7, 'Coupe panneau')])
    }

    if (chemin === '/api/Discussion/sync') {
      return json({ curseur: 1, messages: [], conversations: [] })
    }

    if (chemin === '/api/Discussion/references') {
      return json(options.suggestions ?? [])
    }

    const contexteMatch = chemin.match(/^\/api\/Discussion\/contexte\/([a-z]+)\/(\d+)$/)
    if (contexteMatch && methode === 'POST') {
      contextesOuverts.push(`${contexteMatch[1]}/${contexteMatch[2]}`)
      if (options.contexteInterdit) {
        return json({ message: 'Accès refusé au module de cet objet.' }, 403)
      }
      return json(conversationContexte())
    }

    const messagesMatch = chemin.match(/^\/api\/Discussion\/(\d+)\/messages$/)
    if (messagesMatch) {
      if (methode === 'POST') {
        const corps = route.request().postDataJSON() as { contenu: string }
        envois.push(corps)
        return json(
          message({ id: 99, contenu: corps.contenu, auteurUserId: MOI, auteurNom: 'Meme Moi', revision: 99 }),
          201,
        )
      }
      return json(options.historique ?? [])
    }

    if (/^\/api\/Discussion\/\d+\/lire$/.test(chemin)) return vide()

    return json([])
  })

  return { contextesOuverts, envois }
}

/**
 * Navigue vers la page Tâches et attend que la session soit hydratée.
 *
 * Sans cette attente, un clic effectué juste après `goto` peut être annulé : la
 * résolution de `useAuth()` fait remonter la topbar (nom « Meme Moi »), ce qui
 * remet à zéro l'état local des panneaux (cloche notif., dialogue Discussion).
 */
async function ouvrirTaches(page: Page) {
  await page.goto('/taches', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('header').getByText('Meme Moi')).toBeVisible({ timeout: 15_000 })
}

test.describe('LOT 20 — Discussion contextuelle (E3)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (e) => console.error('ERREUR DE RENDU :', e.message))
  })

  test('la carte d’une tâche ouvre sa discussion rattachée', async ({ page }) => {
    const { contextesOuverts } = await installer(page, {
      historique: [
        message({ id: 1, contenu: 'Peux-tu confirmer les tailles ?', auteurUserId: AUTRE, auteurNom: 'Collegue Test' }),
      ],
    })
    await ouvrirTaches(page)

    // À LA DEMANDE : consulter la fiche ne crée aucune conversation.
    await expect(page.getByTestId('discussion-tache-7')).toBeVisible()
    expect(contextesOuverts).toHaveLength(0)

    await page.getByTestId('discussion-tache-7').click()

    // L'ouverture passe par l'endpoint idempotent du contexte.
    await expect.poll(() => contextesOuverts, { timeout: 15_000 }).toContain('tache/7')
    await expect(
      page.getByTestId('discussion-messages').getByText('Peux-tu confirmer les tailles ?'),
    ).toBeVisible()
  })

  test('une référence est rendue en carte, sans montant sans droit d’écriture', async ({ page }) => {
    await installer(page, {
      historique: [
        message({
          id: 1,
          contenu: 'Voir #CMD-123 pour la commande',
          auteurUserId: AUTRE,
          auteurNom: 'Collegue Test',
          references: [
            {
              type: 'Commande',
              reference: 'CMD-123',
              id: 123,
              libelle: 'Commande été',
              statut: 'En production',
              date: '2026-10-01T00:00:00',
              montant: null,
              devise: null,
              tiers: null,
            },
          ],
        }),
      ],
    })
    await ouvrirTaches(page)
    await page.getByTestId('discussion-tache-7').click()

    const carte = page.getByTestId('reference-CMD-123')
    await expect(carte).toBeVisible({ timeout: 15_000 })
    await expect(carte).toContainText('Commande été')
    await expect(carte).toContainText('En production')
  })

  test('sans le droit du module, la discussion de l’objet est annoncée (403)', async ({ page }) => {
    await installer(page, { contexteInterdit: true })
    await ouvrirTaches(page)
    await page.getByTestId('discussion-tache-7').click()

    await expect(page.getByText('Discussion non accessible')).toBeVisible({ timeout: 15_000 })
  })

  test('la cloche affiche une mention de discussion et route vers /discussion', async ({ page }) => {
    await installer(page, {
      notifications: [
        {
          id: 1,
          message: 'Collegue Test vous a mentionné dans une discussion',
          dateNotification: '2026-10-10T09:05:00',
          estLivree: false,
          type: 'MentionDiscussion',
          planningEntryId: null,
          tacheProductionId: null,
          gmailMessageId: null,
          messageDiscussionId: 42,
        },
      ],
    })
    await ouvrirTaches(page)

    await page.getByRole('button', { name: 'Notifications' }).click()
    const ligne = page.getByText('Collegue Test vous a mentionné dans une discussion')
    await expect(ligne).toBeVisible({ timeout: 15_000 })
    await ligne.click()

    await expect(page).toHaveURL(/\/discussion$/)
  })
})
