'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { GroupeTache } from '@/types/tache'
import type { ApiError } from '@/types'

const KEY = ['taches'] as const
const GROUPES_KEY = [...KEY, 'groupes'] as const

export function useGetGroupesTaches() {
  return useQuery<GroupeTache[]>({
    queryKey: GROUPES_KEY,
    queryFn: () => apiClient.get<GroupeTache[]>('/api/TacheProduction/Groupes'),
  })
}

export function useCreateGroupeTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nom: string; description?: string | null }) =>
      apiClient.post<{ message: string; id: number }>('/api/TacheProduction/Groupes', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GROUPES_KEY })
      toast.success('Groupe créé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateGroupeTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiClient.put<{ message: string }>(`/api/TacheProduction/Groupes/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GROUPES_KEY })
      toast.success('Groupe mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteGroupeTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.del<{ message: string }>(`/api/TacheProduction/Groupes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GROUPES_KEY })
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Groupe supprimé (tâches générées conservées)')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}

export function useAddLigneGroupe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupeId, data }: { groupeId: number; data: Record<string, unknown> }) =>
      apiClient.post<{ message: string; id: number }>(
        `/api/TacheProduction/Groupes/${groupeId}/Lignes`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GROUPES_KEY })
      toast.success('Ligne ajoutée au groupe')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export function useUpdateLigneGroupe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiClient.put<{ message: string }>(`/api/TacheProduction/Lignes/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GROUPES_KEY })
      toast.success('Ligne mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export function useDeleteLigneGroupe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.del<{ message: string }>(`/api/TacheProduction/Lignes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GROUPES_KEY })
      toast.success('Ligne supprimée du groupe')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /Groupes/{id}/Appliquer — génère une TacheProduction par ligne du groupe.
// Invalide aussi ['taches'] (nouvelles tâches) — pas les commandes (aucune mutation dessus).
export function useAppliquerGroupe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupeId, commandeId }: { groupeId: number; commandeId: number }) =>
      apiClient.post<{ message: string; count: number; ids: number[] }>(
        `/api/TacheProduction/Groupes/${groupeId}/Appliquer`,
        { commandeId },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GROUPES_KEY })
      qc.invalidateQueries({ queryKey: KEY })
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Erreur d'application du groupe"),
  })
}