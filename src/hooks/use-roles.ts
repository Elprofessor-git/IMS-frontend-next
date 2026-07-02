'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Role, CreateRolePayload } from '@/types/role'
import type { ApiError } from '@/types'

const KEY = ['roles'] as const

export function useGetRoles() {
  return useQuery<Role[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<Role[]>('/api/roles'),
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRolePayload) => apiClient.post<Role>('/api/roles', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Rôle créé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & CreateRolePayload) =>
      apiClient.put<void>(`/api/roles/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Rôle mis à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/roles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Rôle supprimé')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer'),
  })
}
