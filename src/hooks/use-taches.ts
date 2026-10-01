'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  TacheEcriturePayload,
  TacheProduction,
  TacheDashboard,
  TacheScope,
  UtilisateurAssignable,
} from '@/types/tache'
import type { ApiError } from '@/types'
import { useCanAssignerTaches } from '@/hooks/use-permissions'

const KEY = ['taches'] as const

/**
 * Liste des tâches visibles par l'utilisateur connecté.
 *
 * `mine` (défaut) = tâches dont l'utilisateur est créateur ou responsable.
 * `all` = toutes les tâches, et le serveur répond 403 si l'utilisateur n'a pas le
 * droit de ressource correspondant. L'UI n'affiche ce mode que s'il est autorisé.
 */
export function useGetTaches(scope: TacheScope = 'mine') {
  return useQuery<TacheProduction[]>({
    queryKey: [...KEY, 'liste', scope],
    queryFn: () =>
      apiClient.get<TacheProduction[]>(`/api/TacheProduction?scope=${scope}`),
  })
}

export function useGetTache(id: number) {
  return useQuery<TacheProduction>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<TacheProduction>(`/api/TacheProduction/${id}`),
    enabled: id > 0,
    // 404 = tâche d'autrui ou inexistante : inutile de réessayer en boucle.
    retry: false,
  })
}

export function useGetTachesDashboard() {
  return useQuery<TacheDashboard>({
    queryKey: [...KEY, 'dashboard'],
    queryFn: () => apiClient.get<TacheDashboard>('/api/TacheProduction/Dashboard'),
  })
}

/**
 * Utilisateurs actifs proposés à l'assignation. La liste permet de choisir un
 * destinataire sans jamais saisir un identifiant à la main ; le serveur revalide
 * systématiquement le droit et l'activité du destinataire.
 */
export function useGetUtilisateursAssignables() {
  // L'annuaire n'est exposé qu'aux utilisateurs ayant le droit d'assigner des
  // tâches. Sans ce droit, l'API répond 403 : on n'appelle donc PAS l'endpoint
  // (évite des requêtes en échec et l'affichage d'une liste vide trompeuse).
  const canAssigner = useCanAssignerTaches()
  return useQuery<UtilisateurAssignable[]>({
    queryKey: [...KEY, 'utilisateurs-assignables'],
    queryFn: () =>
      apiClient.get<UtilisateurAssignable[]>('/api/TacheProduction/UtilisateursAssignables'),
    enabled: canAssigner,
  })
}

export function useCreateTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TacheEcriturePayload) =>
      apiClient.post<TacheProduction>('/api/TacheProduction', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche créée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TacheEcriturePayload }) =>
      apiClient.put<void>(`/api/TacheProduction/${id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Tâche mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

/**
 * Assigne la tâche à un utilisateur du système, ou la désassigne si `assignedToUserId` est
 * vide. Le propriétaire (créateur) n'est jamais modifié par cet appel.
 */
export function useAssignerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, assignedToUserId }: { id: number; assignedToUserId: string | null }) =>
      apiClient.post<{ message: string; assignedToUserId: string | null; responsable: string | null }>(
        `/api/TacheProduction/${id}/Assigner`,
        { assignedToUserId },
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(data.responsable ? `Tâche assignée à ${data.responsable}` : 'Tâche désassignée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Assignation impossible'),
  })
}

export function useDeleteTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/TacheProduction/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}

// POST /{id}/Commencer — aucun body (le responsable = AssignedToUserId déjà posé)
export function useCommencerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/TacheProduction/${id}/Commencer`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche commencée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /{id}/MettreAJourAvancement — [FromBody] decimal → raw JSON number
export function useMettreAJourAvancement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, pourcentage }: { id: number; pourcentage: number }) =>
      apiClient.post<{ message: string }>(
        `/api/TacheProduction/${id}/MettreAJourAvancement`,
        pourcentage,
      ),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      const msg =
        vars.pourcentage >= 100
          ? 'Tâche terminée automatiquement (100%)'
          : `Avancement mis à jour : ${vars.pourcentage}%`
      toast.success(msg)
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /{id}/Bloquer — [FromBody] string → raw JSON string
export function useBloquerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motif }: { id: number; motif: string }) =>
      apiClient.post<{ message: string }>(`/api/TacheProduction/${id}/Bloquer`, motif),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche bloquée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /{id}/Debloquer — aucun body
export function useDebloquerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ message: string }>(`/api/TacheProduction/${id}/Debloquer`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche débloquée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// POST /{id}/Terminer — [FromBody] string → raw JSON string
// Invalide aussi ['commandes'] car Terminer peut clore la CommandeClient parente
export function useTerminerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string | null }) =>
      apiClient.post<{ message: string }>(
        `/api/TacheProduction/${id}/Terminer`,
        notes || null,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['commandes'] })
      toast.success('Tâche terminée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// PUT /{id}/statut — UpdateStatutDto: { statut: string } — Enum.TryParse côté backend
export function useAnnulerTache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.put<void>(`/api/TacheProduction/${id}/statut`, { statut: 'Annule' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Tâche annulée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}
