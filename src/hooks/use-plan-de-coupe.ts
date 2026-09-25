'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { ApiError } from '@/types'
import type {
  PlanDeCoupeLigne,
  CreerPlanDeCoupeLignePayload,
  ModifierPlanDeCoupeLignePayload,
  OrdreDeCoupe,
} from '@/types/matelas'

const KEY = ['matelas'] as const

function planKey(matelasId: number) {
  return [...KEY, matelasId, 'plan-de-coupe']
}

export function useGetPlanDeCoupe(matelasId: number) {
  return useQuery<PlanDeCoupeLigne[]>({
    queryKey: planKey(matelasId),
    queryFn: () => apiClient.get<PlanDeCoupeLigne[]>(`/api/Matelas/${matelasId}/PlanDeCoupe`),
    enabled: matelasId > 0,
  })
}

export function useVinculerInvalidation(commandeId?: number) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['matelas'] })
    qc.invalidateQueries({ queryKey: ['rapport-coupe'] })
    if (commandeId) qc.invalidateQueries({ queryKey: ['fournitures', commandeId] })
  }
}

export function useCreerLignePlan(matelasId: number, commandeId?: number) {
  const invalider = useVinculerInvalidation(commandeId)
  return useMutation({
    mutationFn: (data: CreerPlanDeCoupeLignePayload) =>
      apiClient.post<{ message: string; id: number }>(`/api/Matelas/${matelasId}/PlanDeCoupe`, data),
    onSuccess: () => {
      invalider()
      toast.success('Ligne de plan ajoutée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\'ajout de la ligne de plan'),
  })
}

export function useModifierLignePlan(matelasId: number, commandeId?: number) {
  const invalider = useVinculerInvalidation(commandeId)
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ModifierPlanDeCoupeLignePayload) =>
      apiClient.put<{ message: string; id: number }>(`/api/Matelas/PlanDeCoupe/${id}`, data),
    onSuccess: () => {
      invalider()
      toast.success('Ligne de plan mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour de la ligne de plan'),
  })
}

export function useSupprimerLignePlan(matelasId: number, commandeId?: number) {
  const invalider = useVinculerInvalidation(commandeId)
  return useMutation({
    mutationFn: (id: number) => apiClient.del<{ message: string }>(`/api/Matelas/PlanDeCoupe/${id}`),
    onSuccess: () => {
      invalider()
      toast.success('Ligne de plan supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer la ligne de plan'),
  })
}

// Document Ordre de coupe agrégé (L2) — vue calculée par le backend.
export function useGetOrdreDeCoupe(commandeId: number) {
  return useQuery<OrdreDeCoupe>({
    queryKey: ['rapport-coupe', commandeId, 'ordre-de-coupe'],
    queryFn: () => apiClient.get<OrdreDeCoupe>(`/api/RapportCoupe/${commandeId}/OrdreDeCoupe`),
    enabled: commandeId > 0,
  })
}