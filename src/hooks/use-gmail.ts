'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  CreateTaskFromEmail,
  EmailAiReply,
  EmailTaskSuggestion,
  GmailMessageDetail,
  GmailMessagePage,
  GmailStatus,
  GmailSyncResult,
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
    // Tant que la liste est vide (aucun message synchronisé), inutile de re-polluer l'API.
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

export function useGenerateReply(messageId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (instruction?: string) =>
      apiClient.post<EmailAiReply>(`/api/gmail/messages/${messageId}/replies`, {
        instruction: instruction ?? null,
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
    mutationFn: (replyId: number) =>
      apiClient.post<EmailAiReply>(`/api/gmail/replies/${replyId}/send`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'replies', messageId] })
      qc.invalidateQueries({ queryKey: [...KEY, 'messages'] })
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
      toast.success('Brouillon refusé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}
