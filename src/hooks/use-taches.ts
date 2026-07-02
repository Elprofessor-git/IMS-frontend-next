'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { TacheProduction, TacheDashboard } from '@/types/tache'
import type { ApiError } from '@/types'

const KEY = ['taches'] as const

export function useGetTaches() {
  return useQuery<TacheProduction[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<TacheProduction[]>('/api/TacheProduction'),
  })
}

export function useGetTache(id: number) {
  return useQuery<TacheProduction>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<TacheProduction>(`/api/TacheProduction/${id}`),
    enabled: id > 0,
  })
}

export function useGetTachesDashboard() {
  return useQuery<TacheDashboard>({
    queryKey: [...KEY, 'dashboard'],
    queryFn: () => apiClient.get<TacheDashboard>('/api/TacheProduction/Dashboard'),
  })
}

export function useCreateTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<TacheProduction>('/api/TacheProduction', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche créée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TacheProduction) =>
      apiClient.put<void>(`/api/TacheProduction/${data.id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Tâche mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export function useDeleteTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/TacheProduction/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}

// POST /{id}/Commencer — [FromBody] string → raw JSON string
export function useCommencerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, responsable }: { id: number; responsable: string }) =>
      apiClient.post<{ message: string }>(`/api/TacheProduction/${id}/Commencer`, responsable),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche commencée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /{id}/MettreAJourAvancement — [FromBody] decimal → raw JSON number
export function useMettreAJourAvancement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, pourcentage }: { id: number; pourcentage: number }) =>
      apiClient.post<{ message: string }>(
        `/api/TacheProduction/${id}/MettreAJourAvancement`,
        pourcentage,
      ),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      const msg =
        vars.pourcentage >= 100
          ? 'Tâche terminée automatiquement (100%)'
          : `Avancement mis à jour : ${vars.pourcentage}%`
      toast.success(msg)
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /{id}/Bloquer — [FromBody] string → raw JSON string
export function useBloquerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motif }: { id: number; motif: string }) =>
      apiClient.post<{ message: string }>(`/api/TacheProduction/${id}/Bloquer`, motif),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche bloquée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /{id}/Debloquer — aucun body
export function useDebloquerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/TacheProduction/${id}/Debloquer`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche débloquée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /{id}/Terminer — [FromBody] string → raw JSON string
// Invalide aussi ['commandes'] car Terminer peut clore la CommandeClient parente
export function useTerminerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string | null }) =>
      apiClient.post<{ message: string }>(
        `/api/TacheProduction/${id}/Terminer`,
        notes || null,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['commandes'] })
      toast.success('Tâche terminée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// PUT /{id}/statut — UpdateStatutDto: { statut: string } — Enum.TryParse côté backend
export function useAnnulerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.put<void>(`/api/TacheProduction/${id}/statut`, { statut: 'Annule' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche annulée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}
