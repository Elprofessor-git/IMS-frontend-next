'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  PlanningEntry,
  CreerPlanningEntryPayload,
  ModifierPlanningEntryPayload,
} from '@/types/planning'
import type { ApiError } from '@/types'

const KEY = ['planning'] as const

export function useGetPlanningEntries() {
  return useQuery<PlanningEntry[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<PlanningEntry[]>('/api/planning'),
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: KEY })
  }
}

export function useCreerPlanningEntry() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (data: CreerPlanningEntryPayload) =>
      apiClient.post<{ message: string; id: number }>('/api/planning', data),
    onSuccess: () => {
      invalidate()
      toast.success('Commande planifiée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la planification'),
  })
}

export function useModifierPlanningEntry() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ModifierPlanningEntryPayload) =>
      apiClient.put<{ message: string }>(`/api/planning/${id}`, data),
    onSuccess: () => {
      invalidate()
      toast.success('Cellule de planning mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de modifier la cellule'),
  })
}

export function useSupprimerPlanningEntry() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<{ message: string }>(`/api/planning/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success('Cellule de planning supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer la cellule'),
  })
}