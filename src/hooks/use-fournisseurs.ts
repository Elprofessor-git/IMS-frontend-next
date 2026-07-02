'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Fournisseur, FournisseurHistorique } from '@/types/fournisseur'
import type { ApiError } from '@/types'

const KEY = ['fournisseurs'] as const

export function useGetFournisseurs() {
  return useQuery<Fournisseur[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<Fournisseur[]>('/api/Fournisseur'),
  })
}

export function useGetFournisseur(id: number) {
  return useQuery<Fournisseur>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<Fournisseur>(`/api/Fournisseur/${id}`),
    enabled: id > 0,
  })
}

export function useSearchFournisseurs(terme: string, enabled: boolean) {
  return useQuery<Fournisseur[]>({
    queryKey: [...KEY, 'search', terme],
    queryFn: () => apiClient.get<Fournisseur[]>(`/api/Fournisseur/Search/${encodeURIComponent(terme)}`),
    enabled: enabled && terme.length >= 2,
  })
}

export function useGetFournisseurHistorique(id: number, enabled: boolean) {
  return useQuery<FournisseurHistorique>({
    queryKey: [...KEY, id, 'historique'],
    queryFn: () => apiClient.get<FournisseurHistorique>(`/api/Fournisseur/${id}/Historique`),
    enabled: id > 0 && enabled,
  })
}

export function useCreateFournisseur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Fournisseur>) => apiClient.post<Fournisseur>('/api/Fournisseur', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Fournisseur créé avec succès')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateFournisseur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Fournisseur) => apiClient.put<void>(`/api/Fournisseur/${data.id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Fournisseur mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteFournisseur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/Fournisseur/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Fournisseur supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}

export function useDesactiverFournisseur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Fournisseur/${id}/Desactiver`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Fournisseur désactivé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export function useActiverFournisseur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Fournisseur/${id}/Activer`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Fournisseur activé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}
