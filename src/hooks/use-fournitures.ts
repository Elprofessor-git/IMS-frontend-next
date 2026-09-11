'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  Matelas,
  ChaineProduction,
  FournitureCommandeLigne,
  ReceptionFourniture,
  EnvoiFourniture,
  RapportFournitures,
  CreerMatelasPayload,
  CreerNomenclaturePayload,
  ModifierNomenclaturePayload,
  CreerReceptionPayload,
  CreerEnvoiPayload,
} from '@/types/fourniture'
import type { ApiError } from '@/types'

const KEY = ['fournitures'] as const
const CHAINES_KEY = ['chaines-production'] as const

export function useGetMatelas(commandeId: number) {
  return useQuery<Matelas[]>({
    queryKey: [...KEY, commandeId, 'matelas'],
    queryFn: () => apiClient.get<Matelas[]>(`/api/FournitureCommande/CommandeClient/${commandeId}/Matelas`),
    enabled: commandeId > 0,
  })
}

export function useCreerMatelas(commandeId: number) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: [...KEY, commandeId, 'matelas'] })
  return useMutation({
    mutationFn: (data: CreerMatelasPayload) =>
      apiClient.post<{ message: string; id: number }>(
        `/api/FournitureCommande/CommandeClient/${commandeId}/Matelas`,
        data,
      ),
    onSuccess: () => {
      invalidate()
      toast.success('Matelas créé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création du matelas'),
  })
}

export function useGetChainesProduction() {
  return useQuery<ChaineProduction[]>({
    queryKey: CHAINES_KEY,
    queryFn: () => apiClient.get<ChaineProduction[]>('/api/ChaineProduction'),
  })
}

export function useCreateChaineProduction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nom: string; typeChaine: string }) =>
      apiClient.post<{ message: string; id: number }>('/api/ChaineProduction', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHAINES_KEY })
      toast.success('Chaîne de production créée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création de la chaîne'),
  })
}

export function useUpdateChaineProduction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ModifierChainePayload) =>
      apiClient.put<{ message: string }>(`/api/ChaineProduction/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHAINES_KEY })
      toast.success('Chaîne de production mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour de la chaîne'),
  })
}

export function useDesactiverChaineProduction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<{ message: string }>(`/api/ChaineProduction/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHAINES_KEY })
      toast.success('Chaîne de production désactivée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de désactiver la chaîne'),
  })
}

export function useGetNomenclature(commandeId: number) {
  return useQuery<FournitureCommandeLigne[]>({
    queryKey: [...KEY, commandeId, 'nomenclature'],
    queryFn: () =>
      apiClient.get<FournitureCommandeLigne[]>(
        `/api/FournitureCommande/CommandeClient/${commandeId}/FournitureCommandeLigne`,
      ),
    enabled: commandeId > 0,
  })
}

function useInvalidateAll(commandeId: number) {
  const qc = useQueryClient()
  return () => {
    for (const sub of [
      'nomenclature',
      'receptions',
      'envois',
      'matelas',
      'rapport',
    ]) {
      qc.invalidateQueries({ queryKey: [...KEY, commandeId, sub] })
    }
  }
}

export function useCreerLigneNomenclature(commandeId: number) {
  const invalidate = useInvalidateAll(commandeId)
  return useMutation({
    mutationFn: (data: CreerNomenclaturePayload) =>
      apiClient.post<{ message: string; id: number }>(
        `/api/FournitureCommande/CommandeClient/${commandeId}/FournitureCommandeLigne`,
        data,
      ),
    onSuccess: () => {
      invalidate()
      toast.success('Ligne de fourniture ajoutée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\'ajout de la ligne'),
  })
}

export function useModifierLigneNomenclature(commandeId: number) {
  const invalidate = useInvalidateAll(commandeId)
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ModifierNomenclaturePayload) =>
      apiClient.put<{ message: string }>(
        `/api/FournitureCommande/CommandeClient/${commandeId}/FournitureCommandeLigne/${id}`,
        data,
      ),
    onSuccess: () => {
      invalidate()
      toast.success('Ligne de fourniture mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour de la ligne'),
  })
}

export function useSupprimerLigneNomenclature(commandeId: number) {
  const invalidate = useInvalidateAll(commandeId)
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.del<{ message: string }>(
        `/api/FournitureCommande/CommandeClient/${commandeId}/FournitureCommandeLigne/${id}`,
      ),
    onSuccess: () => {
      invalidate()
      toast.success('Ligne de fourniture supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer la ligne'),
  })
}

export function useGetReceptions(commandeId: number) {
  return useQuery<ReceptionFourniture[]>({
    queryKey: [...KEY, commandeId, 'receptions'],
    queryFn: () =>
      apiClient.get<ReceptionFourniture[]>(
        `/api/FournitureCommande/CommandeClient/${commandeId}/ReceptionFourniture`,
      ),
    enabled: commandeId > 0,
  })
}

export function useCreerReception(commandeId: number) {
  const invalidate = useInvalidateAll(commandeId)
  return useMutation({
    mutationFn: (data: CreerReceptionPayload) =>
      apiClient.post<{ message: string; id: number; totalRecu: number }>(
        `/api/FournitureCommande/CommandeClient/${commandeId}/ReceptionFourniture`,
        data,
      ),
    onSuccess: () => {
      invalidate()
      toast.success('Réception fourniture enregistrée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\'enregistrement de la réception'),
  })
}

export function useGetEnvois(commandeId: number) {
  return useQuery<EnvoiFourniture[]>({
    queryKey: [...KEY, commandeId, 'envois'],
    queryFn: () =>
      apiClient.get<EnvoiFourniture[]>(
        `/api/FournitureCommande/CommandeClient/${commandeId}/EnvoiFourniture`,
      ),
    enabled: commandeId > 0,
  })
}

export function useCreerEnvoi(commandeId: number) {
  const invalidate = useInvalidateAll(commandeId)
  return useMutation({
    mutationFn: (data: CreerEnvoiPayload) =>
      apiClient.post<{ message: string; id: number; totalEnvoye: number }>(
        `/api/FournitureCommande/CommandeClient/${commandeId}/EnvoiFourniture`,
        data,
      ),
    onSuccess: () => {
      invalidate()
      toast.success('Envoi fourniture enregistré')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\'enregistrement de l\'envoi'),
  })
}

export function useGetRapportFournitures(commandeId: number) {
  return useQuery<RapportFournitures>({
    queryKey: [...KEY, commandeId, 'rapport'],
    queryFn: () =>
      apiClient.get<RapportFournitures>(
        `/api/FournitureCommande/CommandeClient/${commandeId}/RapportFournitures`,
      ),
    enabled: commandeId > 0,
  })
}

type ModifierChainePayload = {
  nom?: string
  typeChaine?: string
  estActif?: boolean
}