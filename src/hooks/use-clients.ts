'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Client, ClientHistorique } from '@/types/client'
import type { ApiError } from '@/types'

const KEY = ['clients'] as const

export function useGetClients() {
  return useQuery<Client[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<Client[]>('/api/Client'),
  })
}

export function useGetClient(id: number) {
  return useQuery<Client>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<Client>(`/api/Client/${id}`),
    enabled: id > 0,
  })
}

export function useGetClientHistorique(id: number, enabled: boolean) {
  return useQuery<ClientHistorique>({
    queryKey: [...KEY, id, 'historique'],
    queryFn: () => apiClient.get<ClientHistorique>(`/api/Client/${id}/Historique`),
    enabled: id > 0 && enabled,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Client>) => apiClient.post<Client>('/api/Client', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Client créé avec succès')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Client) => apiClient.put<void>(`/api/Client/${data.id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Client mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/Client/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Client supprimé')
    },
    // Message exact backend : "Impossible de supprimer le client car il a des commandes associées..."
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}

export function useDesactiverClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Client/${id}/Desactiver`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Client désactivé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export function useActiverClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Client/${id}/Activer`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Client activé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}
