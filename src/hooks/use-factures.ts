'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  FactureListDto,
  FactureDetail,
  CreateFacturePayload,
  UpdateFacturePayload,
} from '@/types/facture'
import type { ApiError } from '@/types'

const KEY = ['factures'] as const

export function useGetFactures() {
  return useQuery<FactureListDto[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<FactureListDto[]>('/api/Facture'),
  })
}

export function useGetFacture(id: number) {
  return useQuery<FactureDetail>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<FactureDetail>(`/api/Facture/${id}`),
    enabled: id > 0,
  })
}

export function useCreateFacture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFacturePayload) =>
      apiClient.post<FactureDetail | { id: number; numeroFacture: string }>(
        '/api/Facture',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Facture créée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateFacture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFacturePayload }) =>
      apiClient.put<void>(`/api/Facture/${id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Facture mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useEmettreFacture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Facture/${id}/Emettre`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Facture émise')
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Erreur lors de l'émission"),
  })
}

export function useReglerFacture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Facture/${id}/Regler`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Facture réglée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors du règlement'),
  })
}

export function useDeleteFacture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/Facture/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Facture supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}