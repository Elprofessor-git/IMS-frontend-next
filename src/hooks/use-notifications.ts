'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { NotificationItem, NotificationPayload } from '@/types/notification'
import type { ApiError } from '@/types'

// Route canonique du contrôleur backend : api/Notification (B4). Unique point de
// définition — ne JAMAIS écrire « /api/notifications/... » (minuscules → 404).
export const NOTIFICATION_ROUTE = '/api/Notification'

const KEY = ['notifications', 'me'] as const

// Polling 25 s + refocus : canal temps réel garanti via le proxy Next (B6).
export function useGetNotifications() {
  return useQuery<NotificationPayload>({
    queryKey: KEY,
    queryFn: () => apiClient.get<NotificationPayload>(`${NOTIFICATION_ROUTE}/me`),
    refetchInterval: 25_000,
    refetchOnWindowFocus: true,
  })
}

export function useGetNotificationsData(): {
  notifications: NotificationItem[]
  countNonLivrees: number
  isLoading: boolean
} {
  const { data, isLoading } = useGetNotifications()
  return {
    notifications: data?.notifications ?? [],
    countNonLivrees: data?.countNonLivrees ?? 0,
    isLoading,
  }
}

export function useLivrerNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`${NOTIFICATION_ROUTE}/${id}/livrer`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? 'Impossible de marquer la notification comme livrée'),
  })
}

export function useLivrerToutesNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ message: string }>(`${NOTIFICATION_ROUTE}/livrer-toutes`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Toutes les notifications marquées comme lues')
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? 'Impossible de marquer les notifications comme lues'),
  })
}

// Cible de navigation d'une notification : la page liée à son origine.
//
// Ordre de priorité : la TÂCHE d'abord, l'email ensuite. Une notification
// « tâche créée depuis un email » porte les deux identifiants, mais son destinataire
// est le responsable de la tâche — pas le propriétaire du courrier, qu'il n'a pas le
// droit de lire (isolation des emails). En privilégiant la tâche, le clic aboutit
// toujours à une page réellement accessible, sans jamais contourner une permission.
//
// Repli sur le planning : c'est le seul émetteur historique, et une notification dont
// la cible a été supprimée (FK SetNull) reste lisible ici.
export function getNotificationHref(notification: NotificationItem): string {
  if (notification.tacheProductionId != null) {
    return `/taches?taskId=${notification.tacheProductionId}`
  }
  if (notification.gmailMessageId != null) {
    return `/courriels?messageId=${notification.gmailMessageId}`
  }
  return '/planning'
}
