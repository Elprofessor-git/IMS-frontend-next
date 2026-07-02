'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { MouvementStock, MouvementStatistiques, TransfertPayload, TransfertResponse, FiltrerParams } from '@/types/mouvement'
import type { ApiError } from '@/types'

const KEY = ['mouvements'] as const

export function useGetMouvements() {
  return useQuery<MouvementStock[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<MouvementStock[]>('/api/MouvementStock'),
  })
}

export function useGetMouvementsByStock(stockId: number) {
  return useQuery<MouvementStock[]>({
    queryKey: [...KEY, 'stock', stockId],
    queryFn: () => apiClient.get<MouvementStock[]>(`/api/MouvementStock/ByStock/${stockId}`),
    enabled: stockId > 0,
  })
}

export function useGetMouvementsByArticle(articleId: number) {
  return useQuery<MouvementStock[]>({
    queryKey: [...KEY, 'article', articleId],
    queryFn: () => apiClient.get<MouvementStock[]>(`/api/MouvementStock/ByArticle/${articleId}`),
    enabled: articleId > 0,
  })
}

export function useFiltrerMouvements(params: FiltrerParams) {
  const searchParams = new URLSearchParams()
  if (params.dateDebut) searchParams.set('dateDebut', params.dateDebut)
  if (params.dateFin) searchParams.set('dateFin', params.dateFin)
  if (params.typeMouvement !== undefined) searchParams.set('typeMouvement', String(params.typeMouvement))
  if (params.origineMouvement !== undefined) searchParams.set('origineMouvement', String(params.origineMouvement))
  if (params.articleId !== undefined) searchParams.set('articleId', String(params.articleId))
  if (params.effectuePar) searchParams.set('effectuePar', params.effectuePar)
  const qs = searchParams.toString()

  return useQuery<MouvementStock[]>({
    queryKey: [...KEY, 'filtrer', params],
    queryFn: () => apiClient.get<MouvementStock[]>(`/api/MouvementStock/Filtrer${qs ? `?${qs}` : ''}`),
  })
}

export function useMouvementStatistiques(params: Pick<FiltrerParams, 'dateDebut' | 'dateFin'>) {
  const searchParams = new URLSearchParams()
  if (params.dateDebut) searchParams.set('dateDebut', params.dateDebut)
  if (params.dateFin) searchParams.set('dateFin', params.dateFin)
  const qs = searchParams.toString()

  return useQuery<MouvementStatistiques>({
    queryKey: [...KEY, 'statistiques', params],
    queryFn: () => apiClient.get<MouvementStatistiques>(`/api/MouvementStock/Statistiques${qs ? `?${qs}` : ''}`),
  })
}

export function useCreateMouvement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<MouvementStock>('/api/MouvementStock', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['stocks'] })
      toast.success('Mouvement enregistré')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useTransfertStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransfertPayload) =>
      apiClient.post<TransfertResponse>('/api/MouvementStock/Transfert', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['stocks'] })
      toast.success('Transfert effectué')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors du transfert'),
  })
}

export function useDeleteMouvement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/MouvementStock/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['stocks'] })
      toast.success('Mouvement supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}
