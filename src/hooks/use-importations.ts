'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Importation, LigneImportation } from '@/types/importation'
import type { ApiError } from '@/types'

const KEY = ['importations'] as const

export function useGetImportations() {
  return useQuery<Importation[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<Importation[]>('/api/Importation'),
  })
}

export function useGetImportation(id: number) {
  return useQuery<Importation>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<Importation>(`/api/Importation/${id}`),
    enabled: id > 0,
  })
}

export type FiltrerImportationParams = {
  dateDebut?: string
  dateFin?: string
  fournisseurId?: number
  statut?: number
}

export function useFiltrerImportations(params: FiltrerImportationParams) {
  const sp = new URLSearchParams()
  if (params.dateDebut) sp.set('dateDebut', params.dateDebut)
  if (params.dateFin) sp.set('dateFin', params.dateFin)
  if (params.fournisseurId !== undefined) sp.set('fournisseurId', String(params.fournisseurId))
  if (params.statut !== undefined) sp.set('statut', String(params.statut))
  const qs = sp.toString()

  return useQuery<Importation[]>({
    queryKey: [...KEY, 'filtrer', params],
    queryFn: () => apiClient.get<Importation[]>(`/api/Importation/Filtrer${qs ? `?${qs}` : ''}`),
  })
}

export function useCreateImportation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<Importation>('/api/Importation', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Importation créée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateImportation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Importation) =>
      apiClient.put<void>(`/api/Importation/${data.id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Importation mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteImportation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/Importation/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Importation supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}

export function useAjouterLigneImportation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      importationId,
      data,
    }: {
      importationId: number
      data: Record<string, unknown>
    }) =>
      apiClient.post<LigneImportation>(
        `/api/Importation/${importationId}/LignesImportation`,
        data,
      ),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.importationId] })
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Ligne ajoutée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export function useSoumettreImportation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Importation/${id}/Soumettre`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      toast.success('Importation soumise')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la soumission'),
  })
}

// [FromBody] string → JSON.stringify("nom") = '"nom"'
export function useValiderImportation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, validePar }: { id: number; validePar: string }) =>
      apiClient.post<{ message: string }>(`/api/Importation/${id}/Valider`, validePar),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Importation validée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la validation'),
  })
}

export function useRecevoirImportation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/Importation/${id}/Recevoir`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      qc.invalidateQueries({ queryKey: ['stocks'] })
      toast.success('Importation reçue — stock mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la réception'),
  })
}

export function useAffecterCommandes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string; affectations: object[] }>(
        `/api/Importation/${id}/AffecterCommandes`,
      ),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
      qc.invalidateQueries({ queryKey: ['stocks'] })
      toast.success('Affectation aux commandes effectuée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\'affectation'),
  })
}
