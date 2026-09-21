'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  PlanningGrille,
  CreerPlanningEntryPayload,
  ModifierPlanningEntryPayload,
} from '@/types/planning'
import type { ApiError } from '@/types'

export const PLANNING_KEY = ['planning'] as const

// Récupération de la grille réelle { chaines, cellules }. Le polling (25 s +
// refocus) est le canal temps réel garanti : le hub SignalR n'est pas utilisé
// (le JWT est dans un cookie httpOnly, inaccessible à une connexion WebSocket).
export function useGetPlanningGrille() {
  return useQuery<PlanningGrille>({
    queryKey: PLANNING_KEY,
    queryFn: () => apiClient.get<PlanningGrille>('/api/planning'),
    refetchInterval: 25_000,
    refetchOnWindowFocus: true,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: PLANNING_KEY })
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