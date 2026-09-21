'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { NotificationItem } from '@/types/notification'
import type { ApiError } from '@/types'

const KEY = ['notifications', 'me'] as const

export function useGetNotifications() {
  return useQuery<NotificationItem[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<NotificationItem[]>('/api/notifications/me'),
  })
}

export function useLivrerNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/notifications/${id}/livrer`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? 'Impossible de marquer la notification comme livrée'),
  })
}