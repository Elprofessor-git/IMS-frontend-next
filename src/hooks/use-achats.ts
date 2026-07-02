'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Achat, LigneAchat } from '@/types/achat'
import type { ApiError } from '@/types'

const KEY = ['achats'] as const

export function useGetAchats() {
  return useQuery<Achat[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<Achat[]>('/api/Achat'),
  })
}

export function useGetAchat(id: number) {
  return useQuery<Achat>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<Achat>(`/api/Achat/${id}`),
    enabled: id > 0,
  })
}

export function useCreateAchat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<Achat>('/api/Achat', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Achat créé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateAchat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Achat) => apiClient.put<void>(`/api/Achat/${data.id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Achat mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteAchat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/Achat/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Achat supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}

export function useAjouterLigneAchat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ achatId, data }: { achatId: number; data: Record<string, unknown> }) =>
      apiClient.post<LigneAchat>(`/api/Achat/${achatId}/LignesAchat`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.achatId] })
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Ligne ajoutée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export function useSoumettreAchat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Achat/${id}/Soumettre`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Achat soumis')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la soumission'),
  })
}

export function useConfirmerAchat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string; tacheReceptionId: number }>(`/api/Achat/${id}/Confirmer`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Achat confirmé — tâche de réception créée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la confirmation'),
  })
}

export function useLivrerAchat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Achat/${id}/Livrer`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      qc.invalidateQueries({ queryKey: ['stocks'] })
      toast.success('Achat livré — stock mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la livraison'),
  })
}
