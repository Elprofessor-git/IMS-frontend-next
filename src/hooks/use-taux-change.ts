'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { TauxChange } from '@/types/Devise'
import type { ApiError } from '@/types'

export type CreateTauxChangePayload = {
  deviseCode: string
  dateEffective: string
  taux: number
}

const KEY = ['taux-changes'] as const

export function useGetTauxChanges() {
  return useQuery<TauxChange[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<TauxChange[]>('/api/TauxChange'),
  })
}

export function useCreateTauxChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTauxChangePayload) =>
      apiClient.post<TauxChange>('/api/TauxChange', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Taux de change enregistré')
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? "Erreur lors de l'enregistrement du taux"),
  })
}
