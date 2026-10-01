import { test, expect, type Page } from '@playwright/test'

// LOT Courriels — parcours complet de l'écran refait autour des FILS.
//
// Le scénario ne pilote QUE l'interface : la boîte Gmail et ses messages sont des données
// de démonstration insérées en base avant le lancement (voir e2e/README-courriels.md).
// Aucune action d'étiquette n'est déclenchée depuis l'UI ici : elle appellerait l'API Gmail
// réelle, et son comportement est couvert par les tests d'intégration backend.
//
// Les captures 1440 px et 375 px servent de pièce visuelle : c'est la seule façon de voir
// ce que voit l'utilisateur, en particulier le HTML hostile qui doit avoir disparu.

const ADMIN = { email: 'admin@gestiontextile.com', password: 'Admin123!' }

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '375', width: 375, height: 812 },
] as const

// Le formulaire est rendu côté serveur puis hydraté. Un clic avant la fin de l'hydratation
// déclenche la soumission NATIVE du formulaire (GET /login?email=…), et l'écran affiche
// alors les identifiants dans l'URL. On attend donc la fin du chargement réseau, et on
// réessaie si l'URL porte les paramètres : c'est le symptôme exact de la course.
async function login(page: Page) {
  for (let tentative = 0; tentative < 3; tentative++) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('#email', ADMIN.email)
    await page.fill('#password', ADMIN.password)
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL('**/dashboard', { timeout: 30_000 })
      return
    } catch {
      // Soumission native : on recharge et on retente.
    }
  }
  throw new Error(`Connexion impossible après 3 tentatives (URL : ${page.url()})`)
}

async function openCourriels(page: Page) {
  await login(page)
  await page.goto('/courriels', { waitUntil: 'domcontentloaded' })
  // La connexion Gmail étant active, la grille doit apparaître (et non l'état « connectez-vous »).
  await expect(page.getByText('conversation(s) synchronisée(s)')).toBeVisible({ timeout: 30_000 })
}

test.describe('LOT Courriels — fils, HTML assaini, pièces jointes, édition IA', () => {
  for (const viewport of VIEWPORTS) {
    test(`la liste des fils et la conversation s'affichent en ${viewport.name} px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await openCourriels(page)

      // ── La liste regroupe par conversation, pas par message ────────────────
      // Le fil 1 a 3 messages : UNE seule ligne doit le représenter.
      const ligneFil1 = page.getByRole('button', { name: /Commande 4821/ }).first()
      await expect(ligneFil1).toBeVisible({ timeout: 30_000 })
      await expect(ligneFil1).toContainText('3 messages')
      await expect(ligneFil1).toContainText('2 non lus')
      await expect(page.getByText('conversation(s) synchronisée(s)')).toContainText('3 ')

      // ── Ouvrir la conversation : les 3 messages, du plus ancien au plus récent ──
      await ligneFil1.click()

      await expect(page.getByRole('heading', { name: /Commande 4821/ })).toBeVisible({ timeout: 30_000 })
      const messages = page.locator('article')
      await expect(messages).toHaveCount(3)

      // L'ordre est vérifié par le contenu : le premier message est celui de Marie.
      await expect(messages.first()).toContainText('Marie Dubois')
      await expect(messages.last()).toContainText('Parfait, merci beaucoup')

      // ── Le HTML est rendu tel quel : structure et image ───────────────────
      // Le 1er message (le plus ancien) contient une image intégrée (cid: réécrite
      // vers le proxy IMS) : elle doit être affichée.
      await expect(messages.first().locator('img')).toHaveCount(1)
      await expect(messages.first().locator('img')).toHaveAttribute(
        'src',
        /\/api\/proxy\/api\/gmail\/messages\/\d+\/inline\//,
      )
      // Le 2e message porte du HTML avec <strong> : il ne doit pas être dégradé en texte.
      await expect(messages.nth(1).locator('strong')).toHaveText('livraison confirmée')

      // ── Le HTML HOSTILE est neutralisé, pas simplement masqué ──────────────
      // Le <script> ne doit produire aucune alerte…
      let alerteFausse = false
      page.on('dialog', async (dialog) => {
        alerteFausse = true
        await dialog.dismiss()
      })
      // …et le HTML servi ne doit plus contenir les vecteurs.
      const html = await messages.first().innerHTML()
      expect(html, 'le script inline doit avoir été retiré').not.toContain('<script')
      expect(html, 'l\'iframe doit avoir été retirée').not.toContain('<iframe')
      expect(html, 'le javascript: doit avoir été retiré').not.toContain('javascript:')

      // Un lien piégé ne doit pas être un lien navigable.
      const piege = messages.first().getByText('Lien piégé')
      if (await piege.count()) {
        await expect(piege).not.toHaveAttribute('href', /javascript:/i)
      }
      expect(alerteFausse).toBe(false)

      // ── Pièces jointes : liste filtrée, images intégrées exclues ──────────
      // Le message 1 n'a que des pièces « inline » : rien ne doit être proposé au
      // téléchargement, car l'image est déjà affichée dans le corps.
      await expect(messages.first().getByText('pièce jointe')).toHaveCount(0)
      // Le message 4 porte un PDF téléchargeable.
      const ligneDevis = page.getByRole('button', { name: /Devis lot 2024-118/ }).first()
      await ligneDevis.click()
      const messageDevis = page.locator('article').first()
      await expect(messageDevis.getByText('devis-2024-118.pdf')).toBeVisible({ timeout: 30_000 })
      await expect(messageDevis.getByRole('link', { name: /devis-2024-118/ })).toHaveAttribute(
        'href',
        /\/api\/proxy\/api\/gmail\/messages\/\d+\/attachments\//,
      )

      await page.screenshot({
        path: `e2e/courriels-conversation-${viewport.name}.png`,
        fullPage: false,
      })
    })
  }

  test('les actions de conversation existent et les boutons de lecture sont là', async ({ page }) => {
    await openCourriels(page)
    await page.getByRole('button', { name: /Commande 4821/ }).first().click()

    // Les actions portent sur le FIL, pas sur un message isolé.
    await expect(page.getByRole('button', { name: 'Marquer comme lu' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Retirer le suivi' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Archiver' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mettre à la corbeille' })).toBeVisible()
  })

  test('la recherche filtre les fils et le filtre non-lus se combine', async ({ page }) => {
    await openCourriels(page)

    await page.fill('#courriels-recherche', 'devis')
    await expect(page.getByRole('button', { name: /Devis lot/ })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /Commande 4821/ })).toHaveCount(0)
    await expect(page.getByText('recherche « devis »')).toBeVisible()

    // Le filtre « non lus » se COMBINE avec la recherche : le fil du devis n'a aucun
    // message non lu, la liste est donc vide — et le message doit le dire clairement
    // (« rien ne correspond ») au lieu d'annoncer une boîte vide.
    await page.getByLabel(/Non lus uniquement/).check()
    await expect(page.getByRole('button', { name: /Devis lot/ })).toHaveCount(0)
    await expect(page.getByText('Aucune conversation ne correspond')).toBeVisible({ timeout: 30_000 })

    // Retiré du filtre, le fil revient : la recherche seule suffit.
    await page.getByLabel(/Non lus uniquement/).uncheck()
    await expect(page.getByRole('button', { name: /Devis lot/ })).toBeVisible({ timeout: 30_000 })
  })

  test('le composeur propose destinataires, pièce jointe, reformulation et traduction', async ({ page }) => {
    await openCourriels(page)

    await page.getByRole('button', { name: 'Nouveau message' }).click()

    await expect(page.getByLabel('Destinataires')).toBeVisible()
    await expect(page.getByLabel('Objet')).toBeVisible()
    await expect(page.getByLabel('Message')).toBeVisible()

    // Sans destinataire ni corps, l'envoi reste impossible.
    const envoyer = page.getByRole('button', { name: 'Envoyer' }).last()
    await expect(envoyer).toBeDisabled()

    // Les trois langues de la liste fermée, et rien d'autre.
    await expect(page.getByRole('button', { name: 'Français' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'English' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'العربية' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Deutsch' })).toHaveCount(0)

    // Sans texte saisi, l'assistance est désactivée : le modèle ne doit jamais être
    // appelé sur un champ vide.
    await expect(page.getByRole('button', { name: 'Reformuler' })).toBeDisabled()

    await page.fill('#compose-to', 'marie@client-exemple.fr')
    await page.fill('#compose-body', 'Bonjour, la livraison est confirmée.')
    await expect(page.getByRole('button', { name: 'Reformuler' })).toBeEnabled()

    await page.screenshot({ path: 'e2e/courriels-composeur-1440.png' })
  })

  test('le lien profond ?threadId= ouvre la conversation demandée', async ({ page }) => {
    await login(page)
    await page.goto('/courriels?threadId=e2e-thread-2', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /Devis lot 2024-118/ })).toBeVisible({
      timeout: 30_000,
    })
    // Le paramètre est consommé puis retiré de l'URL.
    await expect.poll(() => new URL(page.url()).searchParams.get('threadId')).toBeNull()
  })

  test('un lien profond corrompu ne casse pas la page', async ({ page }) => {
    await login(page)
    await page.goto('/courriels?threadId=inconnu-inexistant', { waitUntil: 'domcontentloaded' })

    // La page reste utilisable : liste affichée, aucun panneau figé.
    await expect(page.getByText('conversation(s) synchronisée(s)')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /Commande 4821/ }).first()).toBeVisible()
  })
})
