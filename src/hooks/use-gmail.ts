'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  AttachmentMaintenanceReport,
  ComposeMode,
  ComposePrefill,
  CreateTaskFromEmail,
  EmailAiReply,
  EmailTaskSuggestion,
  GmailMessageDetail,
  GmailMessagePage,
  GmailStatus,
  GmailSyncResult,
  GmailThreadDetail,
  GmailThreadPage,
} from '@/types/gmail'
import type { ApiError } from '@/types'

const KEY = ['gmail'] as const

// ── Statut & connexion ─────────────────────────────────────────────────────

export function useGmailStatus() {
  return useQuery<GmailStatus>({
    queryKey: [...KEY, 'status'],
    queryFn: () => apiClient.get<GmailStatus>('/api/gmail/status'),
    staleTime: 30_000,
  })
}

// Retourne l'URL d'autorisation Google. Le state est signé côté backend : l'appel
// redirige le navigateur, il n'y a donc rien à stocker côté client.
export function useGmailConnect() {
  return useMutation({
    mutationFn: () =>
      apiClient.get<{ authorizationUrl: string }>('/api/gmail/connect'),
    onSuccess: (data) => {
      window.location.href = data.authorizationUrl
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? 'Impossible de démarrer la connexion Gmail'),
  })
}

export function useGmailDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<void>('/api/gmail/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Compte Gmail déconnecté')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export type GmailSyncParams = { query?: string; maxResults?: number }

export function useGmailSync() {
  const qc = useQueryClient()
  return useMutation<GmailSyncResult, ApiError, GmailSyncParams | undefined>({
    // Sans argument : synchronisation de la boîte entière avec les valeurs par défaut.
    mutationFn: (params) => {
      const search = new URLSearchParams()
      if (params?.query) search.set('query', params.query)
      if (params?.maxResults) search.set('maxResults', String(params.maxResults))
      const suffix = search.toString() ? `?${search}` : ''
      return apiClient.post<GmailSyncResult>(`/api/gmail/sync${suffix}`)
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(
        result.messagesNouveaux > 0
          ? `${result.messagesNouveaux} nouveau(x) message(s) synchronisé(s)`
          : 'Aucun nouveau message',
      )
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur de synchronisation'),
  })
}

// ── Fils de discussion ─────────────────────────────────────────────────────
//
// La liste principale affiche UN fil par ligne (dernier message), pas un message : c'est
// ce qui fait qu'une discussion de dix messages n'occupe pas dix lignes d'écran.

export function useGmailThreads(params: {
  page: number
  pageSize?: number
  unreadOnly?: boolean
  search?: string
}) {
  const { page, pageSize = 25, unreadOnly = false, search = '' } = params
  return useQuery<GmailThreadPage>({
    queryKey: [...KEY, 'threads', page, pageSize, unreadOnly, search],
    queryFn: () => {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (unreadOnly) queryParams.set('unreadOnly', 'true')
      if (search.trim()) queryParams.set('search', search.trim())
      return apiClient.get<GmailThreadPage>(`/api/gmail/threads?${queryParams}`)
    },
    enabled: page > 0,
    // Rafraîchissement périodique : le service de fond synchronise côté serveur toutes
    // les 5 minutes, sans rechargement de la page. Un refetch de 60 s évite qu'un
    // utilisateur laisse l'onglet ouvert toute la matinée sur une liste figée.
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

export function useGmailThread(gmailThreadId: string | null) {
  return useQuery<GmailThreadDetail>({
    queryKey: [...KEY, 'thread', gmailThreadId],
    // Les identifiants Gmail sont des chaînes opaques : on les encode plutôt que de
    // les interpoler brutes, pour ne jamais produire une URL mal formée si la valeur
    // contient un caractère réservé.
    queryFn: () =>
      apiClient.get<GmailThreadDetail>(`/api/gmail/threads/${encodeURIComponent(gmailThreadId!)}`),
    enabled: !!gmailThreadId && gmailThreadId.length > 0,
  })
}

// ── Messages ───────────────────────────────────────────────────────────────

export function useGmailMessages(params: {
  page: number
  pageSize?: number
  unreadOnly?: boolean
  search?: string
}) {
  const { page, pageSize = 25, unreadOnly = false, search = '' } = params
  return useQuery<GmailMessagePage>({
    queryKey: [...KEY, 'messages', page, pageSize, unreadOnly, search],
    queryFn: () => {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (unreadOnly) queryParams.set('unreadOnly', 'true')
      if (search.trim()) queryParams.set('search', search.trim())
      return apiClient.get<GmailMessagePage>(`/api/gmail/messages?${queryParams}`)
    },
    enabled: page > 0,
  })
}

export function useGmailMessage(id: number | null) {
  return useQuery<GmailMessageDetail>({
    queryKey: [...KEY, 'message', id],
    queryFn: () => apiClient.get<GmailMessageDetail>(`/api/gmail/messages/${id}`),
    enabled: id != null && id > 0,
  })
}

// ── Actions de boîte (lu, étoile, archive, corbeille) ───────────────────────

/**
 * Champs nuls = non demandé. Ils sont omis de la requête plutôt qu'envoyés à `null` :
 * le backend distingue « ne rien changer » de « mettre à false », et `null` dans le
 * JSON ferait la même chose ici — mais omettre rend l'intention explicite.
 */
export type UpdateMessageFlagsPayload = {
  messageId: number
  isRead?: boolean
  isStarred?: boolean
  archive?: boolean
  trash?: boolean
}

export type UpdateMessageFlagsResult = {
  id: number
  isRead: boolean
  isStarred: boolean
  isArchived: boolean
  isTrashed: boolean
}

type FlagFields = Omit<UpdateMessageFlagsPayload, 'messageId'>

/** Ne renvoie que les indicateurs réellement demandés (les `undefined` sont omis). */
function toFlagsBody(flags: FlagFields) {
  return Object.fromEntries(
    Object.entries(flags).filter(([, value]) => value !== undefined),
  )
}

export function useUpdateMessageFlags() {
  const qc = useQueryClient()
  return useMutation<UpdateMessageFlagsResult, ApiError, UpdateMessageFlagsPayload>({
    mutationFn: ({ messageId, ...flags }) =>
      apiClient.patch<UpdateMessageFlagsResult>(
        `/api/gmail/messages/${messageId}`,
        toFlagsBody(flags),
      ),
    onSuccess: (_result, variables) => {
      // Listes ET détail sont invalidés : un message archivé ou mis à la corbeille doit
      // disparaître de la liste, et son fil changer de compteurs. On évite d'appliquer
      // l'état localement à la main, la source de vérité restant la réponse du serveur.
      void qc.invalidateQueries({ queryKey: KEY })
      announceAction(variables)
    },
    onError: (err: ApiError) => toast.error(err.message ?? "L'action a échoué"),
  })
}

export type UpdateThreadFlagsPayload = {
  gmailThreadId: string
  isRead?: boolean
  isStarred?: boolean
  archive?: boolean
  trash?: boolean
}

export type UpdateThreadFlagsResult = UpdateMessageFlagsResult & {
  gmailThreadId: string
  messageCount: number
}

/** Feedback utilisateur commun aux actions message et fil. */
function announceAction(flags: { trash?: boolean; archive?: boolean; isRead?: boolean; isStarred?: boolean }) {
  if (flags.trash) toast.success('Conversation mise à la corbeille')
  else if (flags.archive) toast.success('Conversation archivée')
  else if (flags.isRead === false) toast.success('Marquée comme non lue')
  else if (flags.isRead === true) toast.success('Marquée comme lue')
  else if (flags.isStarred !== undefined) {
    toast.success(flags.isStarred ? 'Suivi activé' : 'Suivi retiré')
  }
}

/**
 * Actions sur toute la conversation. L'endpoint de niveau fil applique l'étiquette en un
 * seul appel Gmail, ce qui évite 12 requêtes et un état à moitié modifié sur un fil long.
 */
export function useUpdateThreadFlags() {
  const qc = useQueryClient()
  return useMutation<UpdateThreadFlagsResult, ApiError, UpdateThreadFlagsPayload>({
    mutationFn: ({ gmailThreadId, ...flags }) =>
      apiClient.patch<UpdateThreadFlagsResult>(
        `/api/gmail/threads/${encodeURIComponent(gmailThreadId)}`,
        toFlagsBody(flags),
      ),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: KEY })
      announceAction(variables)
    },
    onError: (err: ApiError) => toast.error(err.message ?? "L'action a échoué"),
  })
}

// ── Analyse IA « ceci est une tâche » ─────────────────────────────────────

export function useGmailAnalysis(messageId: number | null) {
  return useQuery<EmailTaskSuggestion | null>({
    queryKey: [...KEY, 'analysis', messageId],
    queryFn: () => apiClient.get<EmailTaskSuggestion | null>(`/api/gmail/messages/${messageId}/analysis`),
    enabled: messageId != null && messageId > 0,
  })
}

export function useAnalyzeMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: number) =>
      apiClient.post<EmailTaskSuggestion>(`/api/gmail/messages/${messageId}/analysis`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(
        data.isTask
          ? `Tâche détectée (confiance ${Math.round(data.confidence * 100)} %)`
          : "Aucune action identifiée dans cet email",
      )
    },
    onError: (err: ApiError) => toast.error(err.message ?? "L'analyse IA a échoué"),
  })
}

// Validation humaine : le corps envoyé est la version modifiable de la suggestion.
export function useApproveAnalysis(messageId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTaskFromEmail) =>
      apiClient.post<{ taskId: number; titre: string }>(
        `/api/gmail/messages/${messageId}/analysis/approve`,
        payload,
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['taches'] })
      toast.success(`Tâche « ${data.titre} » créée`)
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Création de la tâche impossible'),
  })
}

export function useRejectAnalysis(messageId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<void>(`/api/gmail/messages/${messageId}/analysis/reject`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Suggestion refusée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// ── Brouillons de réponse IA ───────────────────────────────────────────────

export function useGmailReplies(messageId: number | null) {
  return useQuery<EmailAiReply[]>({
    queryKey: [...KEY, 'replies', messageId],
    queryFn: () => apiClient.get<EmailAiReply[]>(`/api/gmail/messages/${messageId}/replies`),
    enabled: messageId != null && messageId > 0,
  })
}

/**
 * Génère une proposition de l'assistance pour un message de l'IMSI.
 * <para>
 * Le mode est transmis tel quel : « Transférer » demande une note d'accompagnement,
 * « Répondre » et « Répondre à tous » la même chose. Le fil n'est JAMAIS transmis
 * implicitement — seule cette demande décide de ce que le modèle voit.
 * </para>
 */
export function useGenerateReply(messageId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables?: { instruction?: string; mode?: ComposeMode }) =>
      apiClient.post<EmailAiReply>(`/api/gmail/messages/${messageId}/replies`, {
        instruction: variables?.instruction ?? null,
        mode: variables?.mode ?? 'Reply',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Brouillon généré — relisez-le avant envoi')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Génération impossible'),
  })
}

export function useUpdateReply(messageId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: number; body: string; subject?: string | null }) =>
      apiClient.put<EmailAiReply>(`/api/gmail/replies/${payload.id}`, {
        body: payload.body,
        subject: payload.subject ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'replies', messageId] })
      toast.success('Brouillon mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export function useCreateGmailDraft(messageId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (replyId: number) =>
      apiClient.post<EmailAiReply>(`/api/gmail/replies/${replyId}/draft`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'replies', messageId] })
      toast.success('Brouillon créé dans Gmail')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Création du brouillon impossible'),
  })
}

export function useSendReply(messageId: number) {
  const qc = useQueryClient()
  return useMutation({
    // Le texte affiché est transmis : sans lui, l'API relirait l'entité et
    // enverrait la version enregistrée, pas celle relue à l'écran. Les pièces
    // jointes suivent le même chemin (A4) : elles sont choisies côté écran, jamais
    // relues en base.
    mutationFn: (payload: {
      id: number
      body: string
      subject?: string | null
      attachments?: ComposeAttachment[] | null
    }) =>
      apiClient.post<EmailAiReply>(`/api/gmail/replies/${payload.id}/send`, {
        body: payload.body,
        subject: payload.subject,
        attachments: payload.attachments && payload.attachments.length > 0
          ? payload.attachments
          : [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'replies', messageId] })
      qc.invalidateQueries({ queryKey: [...KEY, 'threads'] })
      toast.success('Réponse envoyée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Envoi impossible'),
  })
}

export function useRejectReply(messageId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (replyId: number) =>
      apiClient.post<void>(`/api/gmail/replies/${replyId}/reject`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'replies', messageId] })
      // Le brouillon Gmail a été supprimé : toute trace côté interface doit disparaître.
      qc.invalidateQueries({ queryKey: [...KEY, 'threads'] })
      toast.success('Brouillon refusé et supprimé de Gmail')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// ── Édition IA du brouillon (reformuler / traduire) ───────────────────────
//
// Sans état : le modèle ne reçoit QUE le texte saisi par l'utilisateur, et le résultat
// est renvoyé tel quel pour remplacer le contenu de la zone de composition. Aucun
// enregistrement n'est créé ni modifié.

/**
 * Actions d'édition acceptées par l'endpoint d'édition IA.
 * <para>
 * « Generate » n'édite pas un texte : il en propose un à partir de la seule consigne, ce
 * qui est indispensable à la création d'un message neuf, où la zone de rédaction est
 * vide par définition.
 * </para>
 */
export type DraftEditAction = 'Rewrite' | 'Translate' | 'Generate'
export type TranslateLanguage = 'FR' | 'EN' | 'AR'

export type EditDraftPayload = {
  text: string
  action: DraftEditAction
  instruction?: string | null
  targetLanguage?: string | null
}

export type EditDraftResponse = {
  text: string
  action: string
  targetLanguage?: string | null
}

export function useEditDraft() {
  return useMutation<EditDraftResponse, ApiError, EditDraftPayload>({
    mutationFn: (payload) => apiClient.post<EditDraftResponse>('/api/gmail/drafts/edit', payload),
    onError: (err: ApiError) => toast.error(err.message ?? "L'édition IA a échoué"),
  })
}

// ── Composition et envoi directs ───────────────────────────────────────────

export type ComposeAttachment = {
  fileName: string
  mimeType: string
  contentBase64: string
}

export type ComposeEmailPayload = {
  to: string[]
  cc?: string[] | null
  bcc?: string[] | null
  subject?: string | null
  bodyText?: string | null
  bodyHtml?: string | null
  attachments?: ComposeAttachment[] | null
  /**
   * Mode de composition. Chaîne et non nombre : le serveur refuse une valeur inconnue,
   * et un mode lisible dans le journal vaut mieux qu'un « 2 ».
   */
  mode?: ComposeMode
  /**
   * Message de référence, identifiant IMS. Hors mode « nouveau », il est obligatoire :
   * le serveur en tire le fil et l'en-tête In-Reply-To, que le client n'a jamais le
   * droit de fournir lui-même.
   */
  replyToMessageId?: number | null
  /**
   * Proposition de l'assistance à l'origine du texte. Renseigné, l'envoi referme cette
   * trace en y copiant le texte réellement expédié ; absent, rien n'est écrit en base.
   */
  aiReplyId?: number | null
}

export type ComposeEmailResult = {
  gmailMessageId: string
  gmailThreadId: string
  attachmentCount: number
  totalBytes: number
}

/**
 * Préremplissage du composeur, calculé par le serveur.
 * <para>
 * Le client ne lit ni les participants ni les en-têtes d'objet : la décision du serveur
 * ne peut pas dépendre de ce que le navigateur a su lire. L'appel est sans danger et
 * peut donc être répété.
 * </para>
 */
export function useComposePrefill(messageId: number | null, mode: ComposeMode) {
  return useQuery<ComposePrefill>({
    queryKey: [...KEY, 'compose-prefill', messageId, mode],
    queryFn: () =>
      apiClient.get<ComposePrefill>(
        `/api/gmail/compose/prefill?messageId=${messageId}&mode=${mode}`,
      ),
    enabled: messageId != null && messageId > 0 && mode !== 'New',
    // Un nouveau fil de discussion ne doit pas réutiliser le préremplissage précédent :
    // c'est ce qui ferait apparaître la citation d'un autre message.
    staleTime: 0,
    gcTime: 0,
  })
}

export function useComposeEmail() {
  const qc = useQueryClient()
  return useMutation<ComposeEmailResult, ApiError, ComposeEmailPayload>({
    mutationFn: (payload) => apiClient.post<ComposeEmailResult>('/api/gmail/send', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Email envoyé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? "L'envoi de l'email a échoué"),
  })
}

// ── Maintenance des pièces jointes (administrateur) ─────────────────────────
//
// Jamais automatique : ces endpoints relancent une boîte Gmail et consomment le quota
// du compte qui la porte. Ils ne sont lancés qu'à la demande, depuis l'écran
// d'administration, et la page affiche le compte-rendu. Le message n'est jamais modifié :
// seules les lignes de pièces jointes le sont.

export type AttachmentMaintenanceParams = {
  /** Taille des lots côté serveur (plafonnée par l'API). */
  batchSize?: number
  /** Budget de messages relus pour ce passage : 50 par défaut, 250 au maximum. */
  maxMessages?: number
}

function maintenanceQuery(params?: AttachmentMaintenanceParams): string {
  const search = new URLSearchParams()
  if (params?.batchSize) search.set('batchSize', String(params.batchSize))
  if (params?.maxMessages) search.set('maxMessages', String(params.maxMessages))
  return search.toString() ? `?${search}` : ''
}

/**
 * Rattrapage : crée les lignes de pièces MANQUANTES des messages historiques
 * (importés avant que le produit ne stocke les pièces). Idempotent — un message
 * rattrapé quitte la liste des candidats, donc une relance ne refait rien.
 */
export function useBackfillAttachments() {
  const qc = useQueryClient()
  return useMutation<AttachmentMaintenanceReport, ApiError, AttachmentMaintenanceParams | undefined>({
    mutationFn: (params) =>
      apiClient.post<AttachmentMaintenanceReport>(
        `/api/gmail/maintenance/attachments/rattrapage${maintenanceQuery(params)}`,
      ),
    onSuccess: () => {
      // Le trombone des fils dépend des pièces présentes : la liste doit refléter
      // immédiatement le résultat du rattrapage.
      qc.invalidateQueries({ queryKey: KEY })
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? 'Rattrapage impossible'),
  })
}

/** Requalification : réapplique la règle Content-Disposition / cid: aux pièces existantes. */
export function useRequalifyAttachments() {
  return useMutation<AttachmentMaintenanceReport, ApiError, AttachmentMaintenanceParams | undefined>({
    mutationFn: (params) =>
      apiClient.post<AttachmentMaintenanceReport>(
        `/api/gmail/maintenance/attachments/requalify${maintenanceQuery(params)}`,
      ),
    onError: (err: ApiError) =>
      toast.error(err.message ?? 'Requalification impossible'),
  })
}
