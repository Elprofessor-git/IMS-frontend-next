'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  CommandeClient,
  BesoinCommande,
  ResultatCalcul,
  ValiderRessourcesResponse,
  CalculerResponse,
} from '@/types/commande'
import type { TailleItem, BomItem } from '@/lib/validations/commande'
import type { ApiError } from '@/types'

const KEY = ['commandes'] as const

export function useGetCommandes() {
  return useQuery<CommandeClient[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<CommandeClient[]>('/api/CommandeClient'),
  })
}

export function useGetCommande(id: number) {
  return useQuery<CommandeClient>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<CommandeClient>(`/api/CommandeClient/${id}`),
    enabled: id > 0,
  })
}

export function useCreateCommande() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<CommandeClient>('/api/CommandeClient', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Commande créée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateCommande() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CommandeClient) =>
      apiClient.put<void>(`/api/CommandeClient/${data.id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Commande mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteCommande() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/CommandeClient/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Commande supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}

// POST /Besoins — un par un, quantiteTotale calculée par le backend
export function useAjouterBesoin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      commandeId,
      data,
    }: {
      commandeId: number
      data: Record<string, unknown>
    }) =>
      apiClient.post<BesoinCommande>(
        `/api/CommandeClient/${commandeId}/Besoins`,
        data,
      ),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.commandeId] })
      toast.success('Besoin ajouté')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /Tailles — remplace TOUT le tableau
export function useSetTailles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ commandeId, tailles }: { commandeId: number; tailles: TailleItem[] }) =>
      apiClient.post<{ message: string; count: number }>(
        `/api/CommandeClient/${commandeId}/Tailles`,
        tailles,
      ),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.commandeId] })
      toast.success('Tailles enregistrées')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /Bom — remplace TOUT le tableau
export function useSetBom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ commandeId, bom }: { commandeId: number; bom: BomItem[] }) =>
      apiClient.post<{ message: string; count: number }>(
        `/api/CommandeClient/${commandeId}/Bom`,
        bom,
      ),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.commandeId] })
      toast.success('BOM enregistrée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /Calculer — marge de sécurité, NE concerne PAS ValiderRessources
export function useCalculer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      commandeId,
      margeAppliquee,
    }: {
      commandeId: number
      margeAppliquee: number
    }) =>
      apiClient.post<CalculerResponse>(
        `/api/CommandeClient/${commandeId}/Calculer`,
        { margeAppliquee },
      ),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.commandeId] })
      qc.invalidateQueries({ queryKey: [...KEY, vars.commandeId, 'resultat'] })
      const suffix = data.toutSuffisant ? '— stock suffisant ✓' : '— manques détectés'
      toast.success(`Calcul BOM terminé ${suffix}`)
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur de calcul'),
  })
}

export function useGetResultatCalcul(commandeId: number) {
  return useQuery<ResultatCalcul[]>({
    queryKey: [...KEY, commandeId, 'resultat'],
    queryFn: () =>
      apiClient.get<ResultatCalcul[]>(`/api/CommandeClient/${commandeId}/ResultatCalcul`),
    enabled: commandeId > 0,
  })
}

// POST /ValiderRessources — AUCUN body, AUCUNE marge
// Réponse : { message, pourcentageCouverture, statut: string (pas int) }
export function useValiderRessources() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commandeId: number) =>
      apiClient.post<ValiderRessourcesResponse>(
        `/api/CommandeClient/${commandeId}/ValiderRessources`,
      ),
    onSuccess: (data, commandeId) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, commandeId] })
      const pct = Number(data.pourcentageCouverture).toFixed(1)
      const label = data.statut === 'Prete' ? '— RÉALISABLE ✓' : '— ressources insuffisantes'
      toast.success(`Validation terminée : ${pct}% de couverture ${label}`)
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur de validation'),
  })
}

// POST /GenererTaches — uniquement si statut === 1 (Prete)
export function useGenererTaches() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commandeId: number) =>
      apiClient.post<{ message: string; tacheId: number }>(
        `/api/CommandeClient/${commandeId}/GenererTaches`,
      ),
    onSuccess: (data, commandeId) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, commandeId] })
      toast.success(`Tâches de production générées (tâche #${data.tacheId})`)
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la génération'),
  })
}
