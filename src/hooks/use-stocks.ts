'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Stock, AlerteStock } from '@/types/stock'
import type { ApiError } from '@/types'

const KEY = ['stocks'] as const

export function useGetStocks() {
  return useQuery<Stock[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<Stock[]>('/api/Stock'),
  })
}

export function useGetStock(id: number) {
  return useQuery<Stock>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<Stock>(`/api/Stock/${id}`),
    enabled: id > 0,
  })
}

export function useGetStocksByArticle(articleId: number) {
  return useQuery<Stock[]>({
    queryKey: [...KEY, 'article', articleId],
    queryFn: () => apiClient.get<Stock[]>(`/api/Stock/ByArticle/${articleId}`),
    enabled: articleId > 0,
  })
}

export function useGetStocksLibres() {
  return useQuery<Stock[]>({
    queryKey: [...KEY, 'libres'],
    queryFn: () => apiClient.get<Stock[]>('/api/Stock/Libre'),
  })
}

export function useGetStocksReserves() {
  return useQuery<Stock[]>({
    queryKey: [...KEY, 'reserves'],
    queryFn: () => apiClient.get<Stock[]>('/api/Stock/Reserve'),
  })
}

export function useGetStocksAlertes() {
  return useQuery<AlerteStock[]>({
    queryKey: [...KEY, 'alertes'],
    queryFn: () => apiClient.get<AlerteStock[]>('/api/Stock/Alertes'),
  })
}

export function useCreateStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Stock>) => apiClient.post<Stock>('/api/Stock', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Entrée de stock créée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Stock) => apiClient.put<void>(`/api/Stock/${data.id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Stock mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/Stock/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Stock supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}

// [FromBody] string → body JSON = chaîne entre guillemets (JSON.stringify("john") = '"john"')
export function useValiderStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, validePar }: { id: number; validePar: string }) =>
      apiClient.post<{ message: string }>(`/api/Stock/${id}/Valider`, validePar),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Stock validé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la validation'),
  })
}

// [FromBody] decimal → body JSON = nombre brut (JSON.stringify(25.5) = '25.5')
export function useReserverStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, quantite }: { id: number; quantite: number }) =>
      apiClient.post<{ message: string }>(`/api/Stock/${id}/Reserver`, quantite),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Stock réservé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la réservation'),
  })
}
