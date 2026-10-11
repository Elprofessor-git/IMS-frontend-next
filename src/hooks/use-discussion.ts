'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { useCanUtiliserDiscussion } from '@/hooks/use-permissions'
import type { ApiError } from '@/types'
import type {
  ConversationDiscussion,
  CreerConversationPayload,
  MessageDiscussion,
  ResultatReference,
  SegmentContexte,
  SyncDiscussion,
  UtilisateurDiscussion,
} from '@/types/discussion'

// Route canonique du contrôleur backend : api/Discussion (majuscule). Unique point
// de définition — ne jamais écrire « /api/discussion » (minuscules → 404).
export const DISCUSSION_ROUTE = '/api/Discussion'

const KEY = ['discussion'] as const
const SYNC_KEY = [...KEY, 'sync'] as const
const CONV_KEY = [...KEY, 'conversations'] as const
const FLUX_KEY = [...KEY, 'flux'] as const

// ── Curseur de synchronisation ──────────────────────────────────────────────
//
// Partagé entre le badge de la topbar et la page : une seule requête /sync tourne
// (React Query déduplique par clé), et le curseur doit survivre à un remontage de
// composant. Quand il vaut 0, le backend renvoie l'historique complet des
// conversations de l'utilisateur : c'est le chargement initial, puis seuls les
// changements sont transmis. Le curseur repart de 0 à chaque rechargement complet
// de page — c'est sans danger (idempotent) et évite un état persisté à maintenir.
let curseurSync = 0

// ── Présence de la page Discussion (intervalle adaptatif) ───────────────────
//
// Hors de la page Discussion, le badge se contente de 25 s. Page ouverte ET onglet
// visible, on descend à 3 s pour un temps quasi réel sans marteler le serveur.
let pageDiscussionOuverte = false
const abonnesPresence = new Set<() => void>()

export function setDiscussionPageOuverte(ouverte: boolean) {
  if (ouverte === pageDiscussionOuverte) return
  pageDiscussionOuverte = ouverte
  abonnesPresence.forEach((cb) => cb())
}

function subscribePresence(cb: () => void) {
  abonnesPresence.add(cb)
  return () => {
    abonnesPresence.delete(cb)
  }
}

export function useDiscussionPageOuverte(): boolean {
  return useSyncExternalStore(
    subscribePresence,
    () => pageDiscussionOuverte,
    () => false,
  )
}

/** Vrai tant que l'onglet est visible. Un onglet caché suspend tout polling. */
function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const maj = () => setVisible(document.visibilityState !== 'hidden')
    maj()
    document.addEventListener('visibilitychange', maj)
    return () => document.removeEventListener('visibilitychange', maj)
  }, [])
  return visible
}

// ── Tri et fusion du flux (cache partagé) ───────────────────────────────────

/**
 * Rang de tri : les messages optimistes (id négatif) sont les plus récents et
 * passent donc en fin de liste. Un tri stable conserve leur ordre d'émission.
 */
function rang(m: MessageDiscussion): number {
  return m.id < 0 ? Number.MAX_SAFE_INTEGER : m.id
}

function ecrireFlux(
  qc: QueryClient,
  maj: (liste: MessageDiscussion[]) => MessageDiscussion[],
) {
  qc.setQueryData<MessageDiscussion[]>(FLUX_KEY, (prev) => {
    const base = prev ?? []
    return maj(base).sort((a, b) => rang(a) - rang(b))
  })
}

function ajouterFlux(qc: QueryClient, message: MessageDiscussion) {
  ecrireFlux(qc, (liste) => [...liste.filter((m) => m.id !== message.id), message])
}

function retirerFlux(qc: QueryClient, id: number) {
  ecrireFlux(qc, (liste) => liste.filter((m) => m.id !== id))
}

function remplacerFlux(qc: QueryClient, id: number, message: MessageDiscussion) {
  ecrireFlux(qc, (liste) => [...liste.filter((m) => m.id !== id), message])
}

/**
 * Fusionne l'historique chargé (GET messages) et le flux temps réel (sync),
 * par identifiant : le flux l'emporte, car une même ligne peut y porter une
 * version plus récente (modifiée ou supprimée). Le résultat est chronologique.
 */
export function fusionnerMessages(
  historique: MessageDiscussion[],
  flux: MessageDiscussion[],
): MessageDiscussion[] {
  const map = new Map<number, MessageDiscussion>()
  for (const m of historique) map.set(m.id, m)
  for (const m of flux) map.set(m.id, m)
  return [...map.values()].sort((a, b) => rang(a) - rang(b))
}

// ── Synchronisation (transport unique du module) ────────────────────────────

/**
 * Polling adaptatif de GET /api/Discussion/sync.
 *
 * - 3 s : la page Discussion est ouverte ET l'onglet est visible ;
 * - 25 s : ailleurs (le badge de la topbar continue de se mettre à jour) ;
 * - suspendu : onglet caché (refetchIntervalInBackground = false).
 *
 * Chaque réponse écrit le snapshot des conversations et fusionne les messages
 * dans le flux, ce qui alimente à la fois la liste, le badge et la conversation
 * ouverte sans requête supplémentaire.
 */
export function useDiscussionSync() {
  const qc = useQueryClient()
  const peutUtiliser = useCanUtiliserDiscussion()
  const pageOuverte = useDiscussionPageOuverte()
  const visible = useDocumentVisible()

  const refetchInterval = !visible ? false : pageOuverte ? 3_000 : 25_000

  return useQuery<SyncDiscussion>({
    queryKey: SYNC_KEY,
    enabled: peutUtiliser,
    queryFn: async () => {
      const data = await apiClient.get<SyncDiscussion>(
        `${DISCUSSION_ROUTE}/sync?depuis=${curseurSync}`,
      )
      curseurSync = data.curseur
      // Le snapshot des conversations fait autorité : il remplace l'existant.
      qc.setQueryData<ConversationDiscussion[]>(CONV_KEY, data.conversations)
      if (data.messages.length > 0) {
        qc.setQueryData<MessageDiscussion[]>(FLUX_KEY, (prev) => {
          const map = new Map<number, MessageDiscussion>(
            (prev ?? []).map((m) => [m.id, m]),
          )
          for (const m of data.messages) map.set(m.id, m)
          return [...map.values()].sort((a, b) => rang(a) - rang(b))
        })
      }
      return data
    },
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

/** Conversations (snapshot du dernier /sync), triées par activité décroissante. */
export function useDiscussionConversations(): ConversationDiscussion[] {
  const { data } = useQuery<ConversationDiscussion[]>({
    queryKey: CONV_KEY,
    // Cache alimenté par useDiscussionSync : la requête n'est jamais lancée seule.
    queryFn: () => apiClient.get<ConversationDiscussion[]>(DISCUSSION_ROUTE),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
  return data ?? []
}

/** Total des non-lus, toutes conversations : alimente le badge de la topbar. */
export function useDiscussionNonLus(): number {
  const conversations = useDiscussionConversations()
  return conversations.reduce((total, c) => total + c.nonLus, 0)
}

/** Messages du flux appartenant à une conversation (cache partagé). */
export function useDiscussionFlux(conversationId: number | null): MessageDiscussion[] {
  const { data } = useQuery<MessageDiscussion[]>({
    queryKey: FLUX_KEY,
    queryFn: () => [],
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
  if (conversationId == null) return []
  return (data ?? []).filter((m) => m.conversationId === conversationId)
}

// ── Historique paginé ───────────────────────────────────────────────────────

/**
 * Page la plus récente (30 messages) d'une conversation.
 *
 * `refetchInterval` est requis pour les conversations CONTEXTUELLES (E3) : elles
 * sont volontairement exclues de /sync (l'accès suit le module de l'objet, pas
 * l'appartenance), donc l'historique est leur seul transport — on le repolle tant
 * que la fiche est ouverte. Les conversations libres, elles, sont poussées par /sync.
 */
export function useDiscussionHistory(
  conversationId: number | null,
  refetchInterval: number | false = false,
) {
  return useQuery<MessageDiscussion[]>({
    queryKey: [...KEY, 'messages', conversationId],
    queryFn: () =>
      apiClient.get<MessageDiscussion[]>(
        `${DISCUSSION_ROUTE}/${conversationId}/messages`,
      ),
    enabled: conversationId != null,
    refetchInterval,
  })
}

// ── Conversations contextuelles (E3) ────────────────────────────────────────

/**
 * Ouvre (ou crée) la discussion rattachée à un objet métier. L'endpoint est
 * idempotent : le second appel renvoie la même conversation. POST volontaire malgré
 * la sémantique de lecture — c'est une création à la demande —, et la requête est
 * mise en cache par clé pour ne pas re-créer à chaque rendu.
 */
export function useDiscussionContexte(
  segment: SegmentContexte,
  objetId: number | null,
  enabled = true,
) {
  return useQuery<ConversationDiscussion>({
    queryKey: [...KEY, 'contexte', segment, objetId],
    queryFn: () =>
      apiClient.post<ConversationDiscussion>(
        `${DISCUSSION_ROUTE}/contexte/${segment}/${objetId}`,
      ),
    enabled: enabled && objetId != null && objetId > 0,
    staleTime: Infinity,
    retry: false,
  })
}

// ── Autocomplétion des références (E3) ──────────────────────────────────────

/**
 * Suggestions de références pour un fragment saisi après « # ». Ne renvoie que des
 * objets ACCESSIBLES à l'utilisateur : l'autocomplétion ne révèle jamais l'existence
 * d'un objet hors de ses permissions.
 */
export function useReferencesAutocomplete(terme: string, enabled: boolean) {
  const q = terme.trim().replace(/^#/, '')
  return useQuery<ResultatReference[]>({
    queryKey: [...KEY, 'references', q],
    queryFn: () =>
      apiClient.get<ResultatReference[]>(
        `${DISCUSSION_ROUTE}/references?q=${encodeURIComponent(q)}`,
      ),
    enabled: enabled && q.length > 0,
    staleTime: 15_000,
  })
}

/** Page précédente (messages plus anciens), chargée à la demande. */
export function useMessagesAnterieurs() {
  return useMutation<
    { conversationId: number; messages: MessageDiscussion[] },
    ApiError,
    { conversationId: number; avantId: number }
  >({
    mutationFn: async ({ conversationId, avantId }) => {
      const messages = await apiClient.get<MessageDiscussion[]>(
        `${DISCUSSION_ROUTE}/${conversationId}/messages?avantId=${avantId}`,
      )
      return { conversationId, messages }
    },
  })
}

// ── Annuaire ────────────────────────────────────────────────────────────────

/** Comptes actifs ET internes (hors moi), pour le sélecteur de participants. */
export function useDiscussionUtilisateurs(enabled: boolean) {
  return useQuery<UtilisateurDiscussion[]>({
    queryKey: [...KEY, 'utilisateurs'],
    queryFn: () => apiClient.get<UtilisateurDiscussion[]>(`${DISCUSSION_ROUTE}/utilisateurs`),
    enabled,
    staleTime: 60_000,
  })
}

// ── Écritures ───────────────────────────────────────────────────────────────

/** Créer un DM, un groupe ou un canal. */
export function useCreerConversation() {
  const qc = useQueryClient()
  return useMutation<ConversationDiscussion, ApiError, CreerConversationPayload>({
    mutationFn: (payload) =>
      apiClient.post<ConversationDiscussion>(DISCUSSION_ROUTE, payload),
    onSuccess: (conversation) => {
      // Insertion immédiate en tête : l'utilisateur voit sa conversation sans
      // attendre le prochain /sync (≤ 3 s).
      qc.setQueryData<ConversationDiscussion[]>(CONV_KEY, (prev) => [
        conversation,
        ...(prev ?? []).filter((c) => c.id !== conversation.id),
      ])
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? 'Création de la conversation impossible'),
  })
}

/** Envoi optimiste : le message apparaît tout de suite, le texte reste en cas d'échec. */
export function useEnvoyerMessage(conversationId: number) {
  const qc = useQueryClient()
  return useMutation<
    MessageDiscussion,
    ApiError,
    { contenu: string; reponseAId?: number | null; auteur: { userId: string; nom: string } },
    { tempId: number }
  >({
    mutationFn: ({ contenu, reponseAId }) =>
      apiClient.post<MessageDiscussion>(`${DISCUSSION_ROUTE}/${conversationId}/messages`, {
        contenu,
        reponseAId: reponseAId ?? null,
      }),
    onMutate: ({ contenu, auteur }) => {
      const tempId = -Date.now()
      ajouterFlux(qc, {
        id: tempId,
        conversationId,
        auteurUserId: auteur.userId,
        auteurNom: auteur.nom,
        contenu,
        envoyeLe: new Date().toISOString(),
        modifieLe: null,
        estSupprime: false,
        reponseAId: null,
        revision: Number.MAX_SAFE_INTEGER,
      })
      return { tempId }
    },
    onSuccess: (message, _variables, contexte) => {
      if (contexte) remplacerFlux(qc, contexte.tempId, message)
    },
    onError: (err: ApiError, _variables, contexte) => {
      if (contexte) retirerFlux(qc, contexte.tempId)
      toast.error(err.message ?? "Le message n'a pas pu être envoyé")
    },
  })
}

/** Modifier son propre message. */
export function useModifierMessage(conversationId: number) {
  const qc = useQueryClient()
  return useMutation<MessageDiscussion, ApiError, { messageId: number; contenu: string }>({
    mutationFn: ({ messageId, contenu }) =>
      apiClient.put<MessageDiscussion>(
        `${DISCUSSION_ROUTE}/${conversationId}/messages/${messageId}`,
        { contenu },
      ),
    onSuccess: (message) => {
      remplacerFlux(qc, message.id, message)
      qc.invalidateQueries({ queryKey: [...KEY, 'messages', conversationId] })
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Modification impossible'),
  })
}

/** Supprimer son propre message (suppression logique côté serveur). */
export function useSupprimerMessage(conversationId: number) {
  const qc = useQueryClient()
  return useMutation<void, ApiError, number>({
    mutationFn: (messageId) =>
      apiClient.del<void>(`${DISCUSSION_ROUTE}/${conversationId}/messages/${messageId}`),
    onSuccess: (_result, messageId) => {
      qc.setQueryData<MessageDiscussion[]>(FLUX_KEY, (prev) =>
        (prev ?? []).map((m) =>
          m.id === messageId ? { ...m, contenu: '', estSupprime: true } : m,
        ),
      )
      qc.invalidateQueries({ queryKey: [...KEY, 'messages', conversationId] })
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Suppression impossible'),
  })
}

/** Marquer lu jusqu'à un message. La pastille disparaît immédiatement (optimiste). */
export function useMarquerLu(conversationId: number) {
  const qc = useQueryClient()
  return useMutation<void, ApiError, number>({
    mutationFn: (jusquaMessageId) =>
      apiClient.post<void>(`${DISCUSSION_ROUTE}/${conversationId}/lire`, {
        jusquaMessageId,
      }),
    onMutate: () => {
      qc.setQueryData<ConversationDiscussion[]>(CONV_KEY, (prev) =>
        prev?.map((c) => (c.id === conversationId ? { ...c, nonLus: 0 } : c)),
      )
    },
  })
}
