'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { ApiError } from '@/types/index'

const KEY = ['production'] as const

// ── Types locaux (miroir Dtos.ChaineProduction du backend) ──

export type ChaineProduction = {
  id: number
  nom: string
  typeChaine: string
  estSousTraitant: boolean
  estActif: boolean
  nombreEnvois: number
  nombreExports: number
}

export type CreateChaineProductionPayload = {
  nom: string
  typeChaine: string
  estSousTraitant?: boolean
  estActif?: boolean
}

export type OrderFabricationDetails = {
  id: number
  numeroOF: string
  commandeId: number
  chaineProductionId: number | null
  chaineProductionNom: string | null
  dateCreation: string
  notes: string | null
  totalPieces: number
  nombreLignesTailles: number
  nombreEtiquettes: number
}

export type LigneTaille = {
  id: number
  taille: string
  quantitePrevue: number
  quantiteExportee: number
  quantiteConfectionnee: number
  enCours: number
}

// ── Liste chaînes de production (4.3) ──

export function useGetChainesProduction(activesSeulement = false) {
  return useQuery<ChaineProduction[]>({
    queryKey: [...KEY, 'chaines', activesSeulement],
    queryFn: () =>
      apiClient.get<ChaineProduction[]>(
        `/api/ChaineProduction?activesSeulement=${activesSeulement}`,
      ),
    retry: false,
  })
}

export function useGetChaineProduction(id: number, enabled = true) {
  return useQuery<ChaineProduction>({
    queryKey: [...KEY, 'chaine', id],
    queryFn: () => apiClient.get<ChaineProduction>(`/api/ChaineProduction/${id}`),
    enabled: enabled && id > 0,
    retry: false,
  })
}

export function useCreateChaineProduction() {
  const qc = useQueryClient()
  return useMutation<{ chaine: ChaineProduction; message: string }, ApiError, CreateChaineProductionPayload>({
    mutationFn: (data) =>
      apiClient.post<{ chaine: ChaineProduction; message: string }>('/api/ChaineProduction', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(res.message ?? 'Chaîne de production créée')
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? "Erreur lors de la création de la chaîne"),
  })
}

export function useUpdateChaineProduction(id: number) {
  const qc = useQueryClient()
  return useMutation<{ chaine: ChaineProduction; message: string }, ApiError, Partial<CreateChaineProductionPayload>>({
    mutationFn: (data) =>
      apiClient.put<{ chaine: ChaineProduction; message: string }>(`/api/ChaineProduction/${id}`, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(res.message ?? 'Chaîne de production mise à jour')
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? 'Erreur lors de la mise à jour de la chaîne'),
  })
}

export function useToggleSousTraitantChaine() {
  const qc = useQueryClient()
  return useMutation<{ chaine: ChaineProduction; message: string }, ApiError, { id: number; estSousTraitant: boolean }>({
    mutationFn: ({ id, estSousTraitant }) =>
      apiClient.patch<{ chaine: ChaineProduction; message: string }>(
        `/api/ChaineProduction/${id}`,
        { estSousTraitant },
      ),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(res.message ?? 'Statut sous-traitant mis à jour')
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? "Erreur lors de la mise à jour du statut"),
  })
}

export function useDesactiverChaine(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.del<{ message: string }>(`/api/ChaineProduction/${id}`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(res.message ?? 'Chaîne désactivée')
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? "Erreur lors de la désactivation"),
  })
}

// ── Détails OF + lignes de tailles (réutilisés page production) ──

export function useGetOrdreFabricationDetails(id: number, enabled = true) {
  return useQuery<OrderFabricationDetails>({
    queryKey: [...KEY, 'of', id],
    queryFn: () => apiClient.get<OrderFabricationDetails>(`/api/OrdreFabrication/${id}`),
    enabled: enabled && id > 0,
    retry: false,
  })
}

export function useGetTaillesOrdreFabrication(id: number, enabled = true) {
  return useQuery<LigneTaille[]>({
    queryKey: [...KEY, 'of', id, 'tailles'],
    queryFn: () => apiClient.get<LigneTaille[]>(`/api/OrdreFabrication/${id}/Tailles`),
    enabled: enabled && id > 0,
    retry: false,
  })
}
