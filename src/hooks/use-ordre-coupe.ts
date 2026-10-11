'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { ApiError } from '@/types'
import type {
  OrdreCoupe,
  OrdreCoupeListe,
  CreerOrdreCoupePayload,
  ModifierOrdreCoupePayload,
  CreerTaillePayload,
  ModifierTaillePayload,
  CreerPlanPayload,
  ModifierPlanPayload,
  CreerMatierePayload,
  ModifierMatierePayload,
} from '@/types/ordre-coupe'

const KEY = ['ordre-coupe'] as const

function invalider(qc: ReturnType<typeof useQueryClient>, id?: number) {
  qc.invalidateQueries({ queryKey: KEY })
  if (id) qc.invalidateQueries({ queryKey: [...KEY, id] })
}

export function useGetOrdresCoupe(commandeId: number) {
  return useQuery<OrdreCoupeListe[]>({
    queryKey: [...KEY, 'commande', commandeId],
    queryFn: () => apiClient.get<OrdreCoupeListe[]>(`/api/OrdreCoupe/commande/${commandeId}`),
    enabled: commandeId > 0,
  })
}

export function useGetOrdreCoupe(id: number) {
  return useQuery<OrdreCoupe>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<OrdreCoupe>(`/api/OrdreCoupe/${id}`),
    enabled: id > 0,
  })
}

export function useCreerOrdreCoupe(commandeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreerOrdreCoupePayload) =>
      apiClient.post<{ message: string; id: number }>('/api/OrdreCoupe', data),
    onSuccess: () => {
      invalider(qc)
      qc.invalidateQueries({ queryKey: [...KEY, 'commande', commandeId] })
      toast.success('Ordre de coupe créé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useModifierOrdreCoupe(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ModifierOrdreCoupePayload) =>
      apiClient.put<{ message: string }>(`/api/OrdreCoupe/${id}`, data),
    onSuccess: () => {
      invalider(qc, id)
      toast.success('Ordre de coupe mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function usePreremplirOrdreCoupe(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<OrdreCoupe>(`/api/OrdreCoupe/${id}/Preremplir`),
    onSuccess: () => {
      invalider(qc, id)
      toast.success('Ordre prérempli depuis la commande')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors du préremplissage'),
  })
}

export function useAjouterTaille(ordreId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreerTaillePayload) =>
      apiClient.post<{ message: string; id: number }>(`/api/OrdreCoupe/${ordreId}/tailles`, data),
    onSuccess: () => invalider(qc, ordreId),
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\'ajout de la taille'),
  })
}

export function useModifierTaille(ordreId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ModifierTaillePayload) =>
      apiClient.put<{ message: string }>(`/api/OrdreCoupe/tailles/${id}`, data),
    onSuccess: () => invalider(qc, ordreId),
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour de la taille'),
  })
}

export function useSupprimerTaille(ordreId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<{ message: string }>(`/api/OrdreCoupe/tailles/${id}`),
    onSuccess: () => {
      invalider(qc, ordreId)
      toast.success('Taille supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer la taille'),
  })
}

export function useAjouterPlan(ordreId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreerPlanPayload) =>
      apiClient.post<{ message: string; id: number }>(`/api/OrdreCoupe/${ordreId}/plans`, data),
    onSuccess: () => invalider(qc, ordreId),
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\'ajout du plan'),
  })
}

export function useModifierPlan(ordreId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ModifierPlanPayload) =>
      apiClient.put<{ message: string }>(`/api/OrdreCoupe/plans/${id}`, data),
    onSuccess: () => invalider(qc, ordreId),
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour du plan'),
  })
}

export function useSupprimerPlan(ordreId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<{ message: string }>(`/api/OrdreCoupe/plans/${id}`),
    onSuccess: () => {
      invalider(qc, ordreId)
      toast.success('Plan supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer le plan'),
  })
}

export function useAjouterMatiere(ordreId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreerMatierePayload) =>
      apiClient.post<{ message: string; id: number }>(`/api/OrdreCoupe/${ordreId}/matieres`, data),
    onSuccess: () => invalider(qc, ordreId),
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\'ajout de la matière'),
  })
}

export function useModifierMatiere(ordreId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ModifierMatierePayload) =>
      apiClient.put<{ message: string }>(`/api/OrdreCoupe/matieres/${id}`, data),
    onSuccess: () => invalider(qc, ordreId),
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour de la matière'),
  })
}

export function useSupprimerMatiere(ordreId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<{ message: string }>(`/api/OrdreCoupe/matieres/${id}`),
    onSuccess: () => {
      invalider(qc, ordreId)
      toast.success('Matière supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer la matière'),
  })
}
