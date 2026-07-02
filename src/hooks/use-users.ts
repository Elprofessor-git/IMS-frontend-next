'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { PERMISSIONS_KEY } from '@/hooks/use-permissions'
import type { User } from '@/types/user'
import type { ApiError } from '@/types'

const KEY = ['users'] as const

export function useGetUsers() {
  return useQuery<User[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<User[]>('/api/Account/users'),
  })
}

export function useGetUser(id: string) {
  return useQuery<User>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<User>(`/api/Account/users/${id}`),
    enabled: !!id,
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      nom,
      prenom,
      email,
    }: {
      id: string
      nom: string
      prenom: string | null
      email: string
    }) => apiClient.put<void>(`/api/Account/users/${id}`, { nom, prenom, email }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success('Utilisateur mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useToggleUserActif() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estActif }: { id: string; estActif: boolean }) =>
      apiClient.put<void>(`/api/Account/users/${id}`, { estActif }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      toast.success(vars.estActif ? 'Utilisateur activé' : 'Utilisateur désactivé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

// roleId = null → envoie 0 (convention : 0 = retirer le rôle côté backend)
export function useAssignRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: number | null }) =>
      apiClient.put<void>(`/api/Account/users/${id}`, { roleId: roleId ?? 0 }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      qc.invalidateQueries({ queryKey: PERMISSIONS_KEY })
      toast.success(vars.roleId ? 'Rôle assigné' : 'Rôle retiré')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur'),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.del<void>(`/api/Account/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Utilisateur supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}
