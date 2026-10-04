import { test, expect, type Page } from '@playwright/test'

// LOT B — composeur unique des quatre modes.
//
// Ces tests pilotent l'INTERFACE et rien d'autre : toutes les réponses d'API sont
// interceptées (page.route). Aucune base, aucun serveur, aucun appel à Google — c'est ce
// qui les rend rapides et fiables, et c'est pourquoi ils ne vérifient pas le contrôle
// des droits côté serveur, déjà couvert par les tests d'intégration backend.
//
// Ce que ces tests verrouillent, c'est ce qui s'était fait par inadvertance tant que
// « Nouveau message » et « Répondre » avaient chacun leur éditeur : le même composant
// doit exposer les mêmes actions dans les quatre modes, la citation doit survivre à une
// reformulation, « Annuler » doit ramener le texte d'avant, et l'envoi doit transporter
// le texte AFFICHÉ — pas une version cachée de lui.

const JETON = [
  btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  btoa(
    JSON.stringify({
      sub: 'e2e-composeur',
      unique_name: 'Composeur E2E',
      email: 'composeur@gestiontextile.com',
      role: 'Admin',
      plateformId: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ),
  'signature-bidon',
].join('.')

const MESSAGE = {
  id: 42,
  gmailMessageId: 'e2e-msg-1',
  gmailThreadId: 'e2e-thread-1',
  from: 'Client <client@exemple.fr>',
  to: 'moi@atelier.test, colleague@exemple.fr',
  cc: 'qualite@exemple.fr',
  subject: 'Commande 4821',
  bodyText: 'Bonjour,\nle tissu arrive vendredi.',
  // Styles EN LIGNE : c'est ce que les vrais mails imposent, et ce que la feuille de
  // style du produit doit neutraliser (police et taille).
  bodyHtml:
    '<p style="font-family:Times New Roman;font-size:24px">Bonjour, <b>le tissu</b> arrive vendredi.</p>',
  receivedAt: '2026-06-12T09:15:00Z',
  isRead: true,
  isStarred: false,
  hasAttachments: false,
  attachments: [],
  snippet: 'le tissu arrive vendredi',
}

/** Réponse de préremplissage, calculée par le serveur dans le produit réel. */
const PREFILL: Record<string, unknown> = {
  New: {
    mode: 'New',
    replyToMessageId: 0,
    to: [],
    cc: [],
    subject: '',
    bodyText: '',
    quotedText: '',
    aiReplyId: null,
  },
  Reply: {
    mode: 'Reply',
    replyToMessageId: 42,
    to: ['client@exemple.fr'],
    cc: [],
    subject: 'Re: Commande 4821',
    bodyText: '',
    quotedText: `Le 12/06/2026, Client <client@exemple.fr> a écrit :\n> Bonjour,\n> le tissu arrive vendredi.`,
    aiReplyId: null,
  },
  ReplyAll: {
    mode: 'ReplyAll',
    replyToMessageId: 42,
    to: ['client@exemple.fr'],
    cc: ['colleague@exemple.fr', 'qualite@exemple.fr'],
    subject: 'Re: Commande 4821',
    bodyText: '',
    quotedText: 'Citation du message d’origine.',
    aiReplyId: null,
  },
  Forward: {
    mode: 'Forward',
    replyToMessageId: 42,
    to: [],
    cc: [],
    subject: 'Fwd: Commande 4821',
    bodyText: '',
    quotedText: 'Message transféré.',
    aiReplyId: null,
  },
}

/** Ce que l'IA renvoie, différent selon l'action pour que les tests discernent qui a agi. */
const IA = {
  rewrite: 'Bonjour, le tissu arrivera vendredi. Cordialement.',
  translate: 'Hello, the fabric will arrive on Friday. Best regards.',
  generate: 'Bonjour, nous confirmons la disponibilité pour jeudi.',
}

type Mode = 'New' | 'Reply' | 'ReplyAll' | 'Forward'

/**
 * Intercepte TOUTES les requêtes de l'écran. Les envois sont poussés dans le tableau
 * fourni par le test : c'est ce tableau qui permet d'affirmer que le texte parti est
 * bien celui qui était affiché.
 */
async function mockerApi(page: Page, envois: Record<string, unknown>[] = []) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    // L'application passe par un préfixe de relais (« /api/proxy/api/… ») : on le retire
    // pour raisonner sur les vrais endpoints, sinon aucune correspondance ne se ferait et
    // chaque appel tomberait dans la réponse vide — l'écran afficherait alors « undefined ».
    const chemin = url.pathname.replace(/^\/api\/proxy/, '')
    const json = (corps: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corps) })

    if (chemin === '/api/Auth/me') {
      // Shape EXACT de CurrentUser : un champ mal nommé affiche « undefined » dans
      // l'en-tête et fait échouer les sélecteurs fondés sur le nom.
      return json({
        id: 'e2e-composeur',
        email: 'composeur@gestiontextile.com',
        nom: 'Composeur',
        prenom: 'E2E',
        role: 'Administrateur',
        roleId: 1,
        estAdministrateur: true,
        estActif: true,
      })
    }
    if (chemin === '/api/Permission/me') {
      // Sans cette entrée, PermissionGate affiche « accès refusé » et l'écran des
      // courriels ne s'affiche jamais : le test ne verrait que la porte fermée.
      return json([
        { module: 'courriels', canAccess: true, canWrite: true },
        { module: 'production', canAccess: true, canWrite: true },
      ])
    }
    if (chemin === '/api/gmail/status') return json({ connected: true, email: 'moi@atelier.test', aiAvailable: true })
    if (chemin.startsWith('/api/gmail/threads/')) {
      return json({
        gmailThreadId: 'e2e-thread-1',
        subject: 'Commande 4821',
        messages: [{ ...MESSAGE, gmailThreadId: 'e2e-thread-1' }],
      })
    }
    if (chemin === '/api/gmail/threads') {
      return json({
        items: [
          {
            gmailThreadId: 'e2e-thread-1',
            subject: 'Commande 4821',
            // `participants` est une LISTE d'adresses : la ligne filtre dessus.
            participants: ['client@exemple.fr'],
            lastMessageId: MESSAGE.id,
            lastGmailMessageId: MESSAGE.gmailMessageId,
            lastMessageAt: MESSAGE.receivedAt,
            messageCount: 1,
            unreadCount: 0,
            isStarred: false,
            hasAttachments: false,
            hasTaskSuggestion: false,
            snippet: 'le tissu arrive vendredi',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      })
    }
    if (chemin === '/api/gmail/compose/prefill') {
      const mode = (url.searchParams.get('mode') ?? 'Reply') as Mode
      return json(PREFILL[mode])
    }
    if (chemin === '/api/gmail/drafts/edit') {
      const corps = route.request().postDataJSON() as { action?: string; text?: string }
      if (corps.action === 'Rewrite') return json({ text: IA.rewrite, action: 'Rewrite', targetLanguage: null })
      if (corps.action === 'Generate') return json({ text: IA.generate, action: 'Generate', targetLanguage: null })
      return json({ text: IA.translate, action: 'Translate', targetLanguage: corps.text ? 'EN' : 'EN' })
    }
    if (chemin === '/api/gmail/messages/42/replies') {
      return json({
        id: 7,
        gmailMessageId: 42,
        subject: 'Re: Commande 4821',
        body: IA.generate,
        statut: 'Generated',
        generatedAt: '2026-06-12T10:00:00Z',
        sentAt: null,
        gmailDraftId: null,
      })
    }
    if (chemin === '/api/gmail/send') {
      envois.push(route.request().postDataJSON() as Record<string, unknown>)
      return json({
        gmailMessageId: 'envoye-1',
        gmailThreadId: 'e2e-thread-1',
        attachmentCount: 0,
        totalBytes: 0,
      })
    }
    // Le reste (notifications, chatbot, tâches) : listes vides plausibles.
    if (chemin === '/api/Chatbot/health') return json({ configured: false })
    return json([])
  })

  return envois
}

async function ouvrirComposeur(page: Page, mode: Mode, envois: Record<string, unknown>[] = []) {
  await page.context().addCookies([
    { name: 'sgt_token', value: JETON, url: 'http://localhost:3000' },
  ])
  // Les handlers s'accumulent d'un appel à l'autre : sans retrait explicite, le
  // navigateur garderait N gestionnaires et les envois seraient comptés dans le
  // mauvais tableau.
  await page.unroute('**/api/**')
  await mockerApi(page, envois)
  await page.goto('/courriels', { waitUntil: 'domcontentloaded' })

  if (mode === 'New') {
    await page.getByRole('button', { name: 'Nouveau message' }).first().click()
  } else {
    // Le clic peut être perdu si React n'a pas encore rattaché ses gestionnaires
    // (hydratation en cours) : on réessaie jusqu'à ce que le panneau s'ouvre.
    const ongletComposer = page.getByRole('tab', { name: 'Composer' })
    const ligne = page.getByRole('button', { name: /Commande 4821/ }).first()
    await expect(ligne).toBeVisible()
    for (let essai = 0; essai < 5; essai++) {
      if (await ongletComposer.isVisible().catch(() => false)) break
      await ligne.click()
      await ongletComposer.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
    }
    await ongletComposer.click()
    if (mode !== 'Reply') {
      await page.getByTestId(`basculer-${mode}`).click()
    }
  }
  await expect(page.getByTestId('composeur')).toBeVisible()
  await expect(page.getByTestId('composeur')).toHaveAttribute('data-mode', mode)
}

/** Les cinq actions, présentes dans tous les modes. */
const ACTIONS = [
  'action-generer',
  'action-reformuler',
  'action-traduire-FR',
  'action-traduire-EN',
  'action-traduire-AR',
  'action-annuler-ia',
] as const

test.describe('LOT B — composeur unique', () => {
  // Les erreurs de rendu sont journalisées : un composant qui plante affiche un écran
  // « Une erreur est survenue » sans dire pourquoi, et le test échoue alors sur un
  // simple délai d'attente, sans la cause réelle.
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (e) => console.error('ERREUR DE RENDU :', e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') console.error('CONSOLE :', m.text().slice(0, 400))
    })
  })

  test('les mêmes actions sont proposées dans les quatre modes', async ({ page }) => {
    for (const mode of ['New', 'Reply', 'ReplyAll', 'Forward'] as Mode[]) {
      await ouvrirComposeur(page, mode)
      for (const action of ACTIONS) {
        await expect(
          page.getByTestId(action),
          `action ${action} absente du mode ${mode}`,
        ).toBeVisible()
      }
    }
  })

  test('la citation est affichée hors de la zone de rédaction et ne bouge pas', async ({ page }) => {
    await ouvrirComposeur(page, 'ReplyAll')

    const citation = page.getByTestId('citation')
    await expect(citation).toBeVisible()
    await expect(citation).toContainText('Citation du message')

    // La citation n'est PAS dans le champ modifiable : c'est la garantie structurelle
    // qui empêche « Reformuler » ou « Traduire » de réécrire l'interlocuteur.
    const zone = page.getByTestId('composeur-message')
    await expect(zone).toHaveValue('')

    await zone.fill('Bonjour, le tissu arrivera vendredi.')
    await page.getByTestId('action-reformuler').click()
    await expect(zone).toHaveValue(IA.rewrite)

    // Ni le texte ni la citation n'ont bougé d'une ligne.
    await expect(citation).toContainText('Citation du message')
    await expect(page.getByTestId('composeur-message')).toHaveValue(IA.rewrite)
  })

  test('la typographie du mail ne dicte pas celle de l\'application', async ({ page }) => {
    await ouvrirComposeur(page, 'Reply')
    await page.getByRole('tab', { name: 'Messages' }).click()

    const paragraphe = page.locator('[data-testid="corps-message"] p').first()
    await expect(paragraphe).toBeVisible()

    // 24 px et Times New Roman viennent du style en ligne du mail : l'affichage doit
    // imposer la police et la taille du produit, sans quoi un mail casse la mise en page.
    const style = await paragraphe.evaluate((el) => {
      const computed = getComputedStyle(el)
      return { fontFamily: computed.fontFamily, fontSize: computed.fontSize }
    })
    expect(style.fontSize).not.toBe('24px')
    expect(style.fontFamily.toLowerCase()).not.toContain('times')
  })

  test('traduire remplace le texte sans toucher à la citation', async ({ page }) => {
    await ouvrirComposeur(page, 'Reply')
    await page.getByTestId('composeur-message').fill('Bonjour, le tissu arrive vendredi.')
    await page.getByTestId('action-traduire-EN').click()
    await expect(page.getByTestId('composeur-message')).toHaveValue(IA.translate)
    await expect(page.getByTestId('citation')).toContainText('a écrit')
  })

  test('« Annuler » ramène le texte d’avant la dernière action IA', async ({ page }) => {
    await ouvrirComposeur(page, 'New')

    const zone = page.getByTestId('composeur-message')
    const annuler = page.getByTestId('action-annuler-ia')

    // Rien à annuler avant une action.
    await expect(annuler).toBeDisabled()

    await page.getByTestId('composeur-consigne').fill('confirmer la disponibilité')
    await page.getByTestId('action-generer').click()
    await expect(zone).toHaveValue(IA.generate)
    await expect(annuler).toBeEnabled()

    await annuler.click()
    await expect(zone).toHaveValue('')
    await expect(annuler).toBeDisabled()
  })

  test('le texte affiché est celui qui part, dans les quatre modes', async ({ page }) => {
    for (const mode of ['New', 'Reply', 'ReplyAll', 'Forward'] as Mode[]) {
      const envois: Record<string, unknown>[] = []
      await ouvrirComposeur(page, mode, envois)
      const attendu = `Texte affiché ${mode}`

      await page.getByTestId('composeur-destinataires').fill('cible@exemple.fr')
      await page.getByTestId('composeur-message').fill(attendu)

      // On modifie APRÈS avoir rempli : c'est bien la dernière version affichée qui doit
      // partir, jamais une version intermédiaire.
      await page.getByTestId('composeur-message').fill(`${attendu} (version finale)`)
      await page.getByTestId('composeur-envoyer').click()

      await expect.poll(() => envois.length, { timeout: 15_000 }).toBe(1)
      const envoi = envois[0]
      expect(envoi.mode, `mode transmis pour ${mode}`).toBe(mode)
      expect(envoi.bodyText).toBe(`${attendu} (version finale)`)
      expect(envoi.to).toEqual(['cible@exemple.fr'])
      if (mode !== 'New') expect(envoi.replyToMessageId).toBe(42)
    }
  })
})
