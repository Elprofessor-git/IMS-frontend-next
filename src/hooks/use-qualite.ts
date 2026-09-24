'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  ControleQualite,
  CreateControleQualitePayload,
  CreateEnvoiRetouchePayload,
  ReferenceQualite,
  EnvoiRetouche,
} from '@/types/controle-qualite'
import type { ApiError } from '@/types/index'

const KEY = ['controles-qualite'] as const

// ── Référence (plafond) avant saisie d'un contrôle ──
export function useGetReferenceQualite(params: {
  commandeId: number
  chaineProductionId?: number | null
  taille?: string
  typeControle?: string
  controleParentId?: number | null
  envoiRetoucheId?: number | null
  enabled?: boolean
}) {
  const busca = new URLSearchParams()
  busca.set('commandeId', String(params.commandeId))
  if (params.chaineProductionId) busca.set('chaineProductionId', String(params.chaineProductionId))
  if (params.taille) busca.set('taille', params.taille)
  if (params.typeControle) busca.set('typeControle', params.typeControle)
  if (params.controleParentId) busca.set('controleParentId', String(params.controleParentId))
  if (params.envoiRetoucheId) busca.set('envoiRetoucheId', String(params.envoiRetoucheId))
  return useQuery<ReferenceQualite>({
    queryKey: [...KEY, 'reference', params.commandeId, params.chaineProductionId, params.taille, params.typeControle],
    queryFn: () => apiClient.get<ReferenceQualite>(`/api/ControleQualite/Reference?${busca.toString()}`),
    enabled: params.enabled !== false && params.commandeId > 0,
    retry: false,
  })
}

// ── Liste des contrôles (filtre commande) ──
export function useGetControlesQualite(commandeId?: number, chaineId?: number) {
  const busca = new URLSearchParams()
  if (commandeId) busca.set('commandeId', String(commandeId))
  if (chaineId) busca.set('chaineProductionId', String(chaineId))
  return useQuery<ControleQualite[]>({
    queryKey: [...KEY, 'liste', commandeId, chaineId],
    queryFn: () => apiClient.get<ControleQualite[]>(`/api/ControleQualite?${busca.toString()}`),
    enabled: !!commandeId,
    retry: false,
  })
}

// ── Création contrôle (Interne / RetourSousTraitant) ──
export function useCreateControleQualite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateControleQualitePayload) =>
      apiClient.post<{ controle: ControleQualite }>('/api/ControleQualite', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['qualite-board'] })
      toast.success(`Contrôle n°${res.controle.id} enregistré`)
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? "Erreur lors de l'enregistrement du contrôle"),
  })
}

// ── Envoi retouche (avec plafond strict côté serveur) ──
export function useCreateEnvoiRetouche() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEnvoiRetouchePayload) =>
      apiClient.post<{ id: number; message: string; plafondRestant: number }>('/api/EnvoiRetouche', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['envois-retouche'] })
      toast.success(`Envoi retouche n°${res.id} enregistré`)
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? "Erreur lors de l'envoi en retouche"),
  })
}

// ── Envois retouche d'un contrôle (tour N+1) ──
export function useGetEnvoisRetouche(controleId?: number) {
  return useQuery<EnvoiRetouche[]>({
    queryKey: [...KEY, 'envois', controleId],
    queryFn: () => apiClient.get<EnvoiRetouche[]>(`/api/EnvoiRetouche?controleQualiteId=${controleId}`),
    enabled: !!controleId,
    retry: false,
  })
}
