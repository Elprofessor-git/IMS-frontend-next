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

// ── Types pour le dashboard Production ──
export type ProductionDashboardCommande = {
  commandeId: number
  numeroCommande: string
  titreCommande: string | null
  clientNom: string | null
  statut: string
  // Agrégats étapes
  nombreEtapes: number
  etapesEnCours: number
  etapesBloquees: number
  etapesTerminees: number
  etapesAPlanifier: number
  // Étape courante (la première non terminée, triée par date prévue puis création)
  etapeCouranteType: string | null
  etapeCouranteStatut: string | null
  etapeCouranteChaine: string | null
  etapeCouranteDateFinPrevue: string | null
  // Retard : date fin prévue dépassée ET statut != Termine
  enRetard: boolean
  // Avancement % = étapes terminées / total * 100
  avancement: number
  // Chaîne assignée (la plus fréquente sur les étapes)
  chainePrincipaleNom: string | null
}

export type ProductionDashboardDto = {
  date: string
  nombreCommandes: number
  totalEtapes: number
  etapesEnCours: number
  etapesBloquees: number
  etapesTerminees: number
  commandesEnRetard: number
  commandes: ProductionDashboardCommande[]
}

// ── Types pour les exports (LotExport) par commande/chaîne ──
export type ProductionExportParChaine = {
  chaineProductionId: number
  chaineNom: string
  totalExports: number
  piecesExportees: number
}

// ── Étape d'OF (gamme opératoire 5.3) ──
export type ProductionEtape = {
  id: number
  ordreFabricationId: number
  numeroOF: string | null
  commandeId: number | null
  numeroCommande: string | null
  typeEtape: string
  statut: string
  chaineProductionId: number | null
  chaineProductionNom: string | null
  planningEntryId: number | null
  dateDebutPrevue: string | null
  dateFinPrevue: string | null
  dateDebutReelle: string | null
  dateFinReelle: string | null
  tempsTheoriqueHeures: number | null
  tempsReelHeures: number | null
  responsableAssigne: string | null
  notes: string | null
}

export type ProductionEtapeWritePayload = {
  ordreFabricationId: number
  typeEtape: string
  statut: string
  chaineProductionId: number | null
  planningEntryId: number | null
  dateDebutPrevue: string | null
  dateFinPrevue: string | null
  tempsTheoriqueHeures: number
  responsableAssigne: string | null
  notes: string | null
}

export type ProductionOfLite = {
  id: number
  numeroOF: string
  chaineProductionId: number | null
  chaineProductionNom: string | null
}

// ── Journal du jour : transitions d'étapes aujourd'hui ──
export type ProductionJournalLigne = {
  id: number
  etapeId: number
  numeroOF: string | null
  commandeId: number
  numeroCommande: string | null
  typeEtape: string
  ancienStatut: string | null
  nouveauStatut: string
  chaineNom: string | null
  dateTransition: string
  effectuePar: string | null
}

// ── Dashboard Production hook ──
export function useGetProductionDashboard() {
  return useQuery<ProductionDashboardDto>({
    queryKey: [...KEY, 'dashboard'],
    queryFn: () => apiClient.get<ProductionDashboardDto>('/api/Production/Dashboard'),
    retry: false,
  })
}

// ── Exports par chaîne pour une commande ──
export function useGetProductionExports(commandeId: number) {
  return useQuery<ProductionExportParChaine[]>({
    queryKey: [...KEY, 'exports', commandeId],
    queryFn: () => apiClient.get<ProductionExportParChaine[]>(`/api/Production/Exports/${commandeId}`),
    enabled: commandeId > 0,
    retry: false,
  })
}

// ── Journal du jour ──
export function useGetProductionJournal() {
  return useQuery<ProductionJournalLigne[]>({
    queryKey: [...KEY, 'journal'],
    queryFn: () => apiClient.get<ProductionJournalLigne[]>('/api/Production/Journal'),
    retry: false,
  })
}

// ── Mutations CRUD étapes ──
export function useCreateProductionEtape() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      ordreFabricationId: number
      typeEtape: string
      statut: string
      chaineProductionId?: number | null
      planningEntryId?: number | null
      dateDebutPrevue?: string | null
      dateFinPrevue?: string | null
      dateDebutReelle?: string | null
      dateFinReelle?: string | null
      tempsTheoriqueHeures: number
      tempsReelHeures?: number
      responsableAssigne?: string | null
      notes?: string | null
    }) => apiClient.post<{ message: string; id: number }>('/api/OrdreFabricationEtape', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['production-etapes'] })
      qc.invalidateQueries({ queryKey: ['production', 'dashboard'] })
      toast.success(res.message ?? "Étape créée")
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Erreur lors de la création de l'étape"),
  })
}

export function useUpdateProductionEtape(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      typeEtape?: string
      statut?: string
      chaineProductionId?: number | null
      planningEntryId?: number | null
      dateDebutPrevue?: string | null
      dateFinPrevue?: string | null
      dateDebutReelle?: string | null
      dateFinReelle?: string | null
      tempsTheoriqueHeures?: number
      tempsReelHeures?: number
      responsableAssigne?: string | null
      notes?: string | null
    }) => apiClient.put<{ message: string; id: number }>(`/api/OrdreFabricationEtape/${id}`, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['production-etapes'] })
      qc.invalidateQueries({ queryKey: ['production', 'dashboard'] })
      toast.success(res.message ?? "Étape mise à jour")
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Erreur lors de la mise à jour de l'étape"),
  })
}

export function useDeleteProductionEtape(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.del<{ message: string }>(`/api/OrdreFabricationEtape/${id}`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['production-etapes'] })
      qc.invalidateQueries({ queryKey: ['production', 'dashboard'] })
      toast.success(res.message ?? "Étape supprimée")
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Erreur lors de la suppression de l'étape"),
  })
}

// ── Journal du jour ──
export function useGetProductionJournalHook() {
  return useQuery<ProductionJournalLigne[]>({
    queryKey: [...KEY, 'journal'],
    queryFn: () => apiClient.get<ProductionJournalLigne[]>('/api/Production/Journal'),
    retry: false,
  })
}
