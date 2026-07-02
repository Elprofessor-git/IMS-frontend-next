'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Plateforme } from '@/types/plateforme'
import type { ApiError } from '@/types'

const QUERY_KEY = ['plateformes'] as const

export function useGetPlateformes() {
  return useQuery<Plateforme[]>({
    queryKey: QUERY_KEY,
    queryFn: () => apiClient.get<Plateforme[]>('/api/Plateforme'),
  })
}

export function useGetPlateforme(id: number) {
  return useQuery<Plateforme>({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => apiClient.get<Plateforme>(`/api/Plateforme/${id}`),
    enabled: id > 0,
  })
}

export function useCreatePlateforme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Plateforme>) =>
      apiClient.post<Plateforme>('/api/Plateforme', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Plateforme créée avec succès')
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? 'Erreur lors de la création')
    },
  })
}

export function useUpdatePlateforme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Plateforme) =>
      apiClient.put<void>(`/api/Plateforme/${data.id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: [...QUERY_KEY, vars.id] })
      toast.success('Plateforme mise à jour')
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? 'Erreur lors de la mise à jour')
    },
  })
}

export function useDeletePlateforme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/Plateforme/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Plateforme supprimée')
    },
    onError: (err: ApiError) => {
      // Message exact du backend : "Impossible de supprimer la plateforme car elle a des clients associés."
      toast.error(err.message ?? 'Impossible de supprimer')
    },
  })
}
