'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  OrdreFabrication,
  OrdreFabricationDetail,
  OrdreFabricationWriteResponse,
  CreateOrdreFabricationPayload,
  UpdateOrdreFabricationPayload,
  SaisieTaillePayload,
  CreateEtiquettePayload,
} from '@/types/ordre-fabrication'
import type { ApiError } from '@/types'

const KEY = ['ordres-fabrication'] as const

export function useGetOrdresFabrication(commandeId: number, enabled: boolean) {
  return useQuery<OrdreFabrication[]>({
    queryKey: [...KEY, commandeId],
    queryFn: () =>
      apiClient.get<OrdreFabrication[]>(`/api/OrdreFabrication/CommandeClient/${commandeId}`),
    enabled: commandeId > 0 && enabled,
  })
}

export function useGetOrdreFabrication(id: number, enabled: boolean) {
  return useQuery<OrdreFabricationDetail>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<OrdreFabricationDetail>(`/api/OrdreFabrication/${id}`),
    enabled: id > 0 && enabled,
  })
}

export function useCreateOrdreFabrication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrdreFabricationPayload) =>
      apiClient.post<OrdreFabricationWriteResponse>('/api/OrdreFabrication', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(res.message ?? 'Ordre de fabrication créé')
      if (res.avertissementCohérence) toast.warning(res.avertissementCohérence)
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateOrdreFabrication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateOrdreFabricationPayload) =>
      apiClient.put<OrdreFabricationWriteResponse>(`/api/OrdreFabrication/${id}`, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(res.message ?? 'Ordre de fabrication mis à jour')
      if (res.avertissementCohérence) toast.warning(res.avertissementCohérence)
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteOrdreFabrication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<{ message: string }>(`/api/OrdreFabrication/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Ordre de fabrication supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la suppression'),
  })
}

export function useSetOrdreFabricationTailles(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tailles: SaisieTaillePayload[]) =>
      apiClient.post<OrdreFabricationWriteResponse>(`/api/OrdreFabrication/${id}/Tailles`, tailles),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(res.message ?? 'Répartition enregistrée')
      if (res.avertissementCohérence) toast.warning(res.avertissementCohérence)
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? 'Erreur lors de l\u2019enregistrement de la répartition'),
  })
}

export function useCreateOrdreFabricationEtiquette(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEtiquettePayload) =>
      apiClient.post<{ message: string; id: number }>(`/api/OrdreFabrication/${id}/Etiquettes`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Étiquette enregistrée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\u2019enregistrement'),
  })
}