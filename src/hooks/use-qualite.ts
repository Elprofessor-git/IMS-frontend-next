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

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD QUALITÉ (LOT 14)
// Une ligne par triplet (commande, chaîne, taille) ayant un export,
// plus une ligne de synthèse par commande active sans export.
// ═══════════════════════════════════════════════════════════════════

export type QualiteDashboardLigne = {
  commandeId: number
  numeroCommande: string
  titreCommande: string | null
  clientNom: string | null
  statutCommande: string
  dateCommande: string
  ordreFabricationId: number | null
  numeroOF: string | null
  chaineProductionId: number | null
  chaineNom: string | null
  taille: string | null
  estCommandeSansExport: boolean
  quantiteExportee: number
  quantiteControleeTotale: number
  quantiteAccepteeTotale: number
  quantiteRetoucheTotale: number
  quantiteRebutTotale: number
  r1Restant: number
  rRestant: number
  erRestant: number
  enCours: number
  estSolde: boolean
  statut: string
  statutLabel: string
  nombreControles: number
  nombreEnvois: number
}

export type QualiteDashboard = {
  date: string
  nombreCommandesActives: number
  nombreLignes: number
  quantiteExporteeTotale: number
  quantiteControleeTotale: number
  quantiteAccepteeTotale: number
  quantiteRetoucheTotale: number
  quantiteRebutTotale: number
  commandesAvecControle: number
  commandesSansControle: number
  commandesSoldees: number
  lignes: QualiteDashboardLigne[]
}

const DASH_KEY = ['qualite-dashboard'] as const

export function useGetQualiteDashboard(params?: { recherche?: string; statut?: string | null }) {
  const q = new URLSearchParams()
  if (params?.recherche) q.set('recherche', params.recherche)
  if (params?.statut) q.set('statut', params.statut)
  const qs = q.toString()
  return useQuery<QualiteDashboard>({
    queryKey: [...DASH_KEY, params?.recherche ?? '', params?.statut ?? ''],
    queryFn: () => apiClient.get<QualiteDashboard>(`/api/Qualite/Dashboard${qs ? `?${qs}` : ''}`),
    retry: false,
  })
}

// ═══════════════════════════════════════════════════════════════════
// JOURNAL DU JOUR
// ═══════════════════════════════════════════════════════════════════

export type QualiteJournalLigne = {
  id: number
  type: 'controle' | 'envoi'
  numeroCommande: string | null
  taille: string
  chaineNom: string | null
  quantiteControlee: number | null
  quantiteAcceptee: number | null
  quantiteRetouche: number | null
  quantiteRebut: number | null
  typeControle: string | null
  quantiteRenvoyee: number | null
  effectuePar: string | null
  dateOperation: string
  notes: string | null
}

export function useGetQualiteJournal() {
  return useQuery<QualiteJournalLigne[]>({
    queryKey: [...KEY, 'journal'],
    queryFn: () => apiClient.get<QualiteJournalLigne[]>('/api/Qualite/Journal'),
    retry: false,
  })
}

// ═══════════════════════════════════════════════════════════════════
// CODES DÉFAUTS (référentiel, CRUD complet)
// ═══════════════════════════════════════════════════════════════════

export type DefautCode = {
  id: number
  code: string
  libelle: string
  estActif: boolean
}

export type CreateDefautCodePayload = {
  code: string
  libelle: string
  estActif?: boolean
}

export type UpdateDefautCodePayload = {
  code?: string
  libelle?: string
  estActif?: boolean
}

const DEFAUT_KEY = ['qualite', 'defaut-codes'] as const

export function useGetDefautCodes() {
  return useQuery<DefautCode[]>({
    queryKey: DEFAUT_KEY,
    queryFn: () => apiClient.get<DefautCode[]>('/api/DefautCode'),
    retry: false,
  })
}

export function useCreateDefautCode() {
  const qc = useQueryClient()
  return useMutation<{ id: number }, ApiError, CreateDefautCodePayload>({
    mutationFn: (data) => apiClient.post<{ id: number }>('/api/DefautCode', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DEFAUT_KEY })
      toast.success('Code défaut créé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateDefautCode() {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { id: number } & UpdateDefautCodePayload>({
    mutationFn: ({ id, ...data }) => apiClient.put(`/api/DefautCode/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DEFAUT_KEY })
      toast.success('Code défaut mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteDefautCode() {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, number>({
    mutationFn: (id) => apiClient.del(`/api/DefautCode/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DEFAUT_KEY })
      toast.success('Code défaut supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la suppression'),
  })
}
