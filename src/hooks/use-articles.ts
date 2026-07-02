'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Article, ArticleStockTotal, PaginatedResponse } from '@/types/article'
import type { ArticleSchema } from '@/lib/validations/article'
import type { ApiError } from '@/types'

const KEY = ['articles'] as const

export function useGetArticles(pageNumber = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<Article>>({
    queryKey: [...KEY, 'list', pageNumber, pageSize],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Article>>(
        `/api/Article?pageNumber=${pageNumber}&pageSize=${pageSize}`,
      ),
  })
}

export function useSearchArticles(terme: string, enabled: boolean) {
  return useQuery<Article[]>({
    queryKey: [...KEY, 'search', terme],
    queryFn: () =>
      apiClient.get<Article[]>(`/api/Article/Search/${encodeURIComponent(terme)}`),
    enabled: enabled && terme.length >= 2,
  })
}

export function useGetArticlesByCategorie(categorie: string, enabled: boolean) {
  return useQuery<Article[]>({
    queryKey: [...KEY, 'categorie', categorie],
    queryFn: () =>
      apiClient.get<Article[]>(`/api/Article/ByCategorie/${encodeURIComponent(categorie)}`),
    enabled: enabled && categorie.length > 0,
  })
}

export function useGetArticle(id: number) {
  return useQuery<Article>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<Article>(`/api/Article/${id}`),
    enabled: id > 0,
  })
}

export function useGetArticleStockTotal(id: number, enabled: boolean) {
  return useQuery<ArticleStockTotal>({
    queryKey: [...KEY, id, 'stockTotal'],
    queryFn: () => apiClient.get<ArticleStockTotal>(`/api/Article/${id}/StockTotal`),
    enabled: id > 0 && enabled,
    retry: false, // 404 = no stock, don't retry
  })
}

export function useCreateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ArticleSchema) =>
      apiClient.post<Article>('/api/Article', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Article créé avec succès')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ArticleSchema) =>
      apiClient.put<void>(`/api/Article/${id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Article mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/Article/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Article supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}

export function useDesactiverArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Article/${id}/Desactiver`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Article désactivé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export function useActiverArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Article/${id}/Activer`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Article activé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}
