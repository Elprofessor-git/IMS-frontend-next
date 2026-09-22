'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  RapportCoupe,
  LotCoupe,
  LotExport,
  CreerLotPayload,
  ModifierCoupePayload,
} from '@/types/rapport-coupe'
import type { ApiError } from '@/types'

const KEY = ['rapport-coupe'] as const

export function useGetRapportCoupe(commandeId: number) {
  return useQuery<RapportCoupe>({
    queryKey: [...KEY, commandeId],
    queryFn: () => apiClient.get<RapportCoupe>(`/api/RapportCoupe/${commandeId}`),
    enabled: commandeId > 0,
    retry: false,
  })
}

export function useGetCoupes(commandeId: number) {
  return useQuery<LotCoupe[]>({
    queryKey: [...KEY, commandeId, 'coupes'],
    queryFn: () => apiClient.get<LotCoupe[]>(`/api/RapportCoupe/${commandeId}/Coupes`),
    enabled: commandeId > 0,
  })
}

export function useGetExports(commandeId: number) {
  return useQuery<LotExport[]>({
    queryKey: [...KEY, commandeId, 'exports'],
    queryFn: () => apiClient.get<LotExport[]>(`/api/RapportCoupe/${commandeId}/Exports`),
    enabled: commandeId > 0,
  })
}

function useInvalidate(commandeId: number) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: [...KEY, commandeId] })
    qc.invalidateQueries({ queryKey: [...KEY, commandeId, 'coupes'] })
    qc.invalidateQueries({ queryKey: [...KEY, commandeId, 'exports'] })
    // Le module Coupe alimente aussi la liste globale des matelas et le suivi des commandes.
    qc.invalidateQueries({ queryKey: ['matelas'] })
    qc.invalidateQueries({ queryKey: ['commandes'] })
    qc.invalidateQueries({ queryKey: ['commandes', commandeId] })
  }
}

export function useAjouterCoupe(commandeId: number) {
  const invalidate = useInvalidate(commandeId)
  return useMutation({
    mutationFn: (data: CreerLotPayload) =>
      apiClient.post<{ message: string; id: number; totalTaille: number }>(
        `/api/RapportCoupe/${commandeId}/Coupes`,
        data,
      ),
    onSuccess: () => {
      invalidate()
      toast.success('Coupe enregistrée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\'enregistrement de la coupe'),
  })
}

export function useSupprimerCoupe(commandeId: number) {
  const invalidate = useInvalidate(commandeId)
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/RapportCoupe/Coupes/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success('Coupe supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer la coupe'),
  })
}

export function useModifierCoupe(commandeId: number) {
  const invalidate = useInvalidate(commandeId)
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ModifierCoupePayload) =>
      apiClient.put<{ message: string; id: number; totalTaille: number }>(
        `/api/RapportCoupe/${commandeId}/Coupes/${id}`,
        data,
      ),
    onSuccess: (res) => {
      invalidate()
      toast.success(res.message ?? 'Coupe mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour de la coupe'),
  })
}

export function useAjouterExport(commandeId: number) {
  const invalidate = useInvalidate(commandeId)
  return useMutation({
    mutationFn: (data: CreerLotPayload) =>
      apiClient.post<{ message: string; id: number; totalTaille: number }>(
        `/api/RapportCoupe/${commandeId}/Exports`,
        data,
      ),
    onSuccess: () => {
      invalidate()
      toast.success('Export enregistré')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\'enregistrement de l\'export'),
  })
}

export function useSupprimerExport(commandeId: number) {
  const invalidate = useInvalidate(commandeId)
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/RapportCoupe/Exports/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success('Export supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer l\'export'),
  })
}