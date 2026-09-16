'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { apiClient } from '@/lib/api-client'
import type { PermissionEntry } from '@/types/permission'

export const PERMISSIONS_KEY = ['permissions', 'me'] as const

export function useMyPermissions() {
  const { data: user } = useAuth()
  const userId = user?.id ?? ''
  return useQuery<PermissionEntry[]>({
    queryKey: [...PERMISSIONS_KEY, userId],
    queryFn: () => apiClient.get<PermissionEntry[]>('/api/Permission/me'),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
}

export function useCanAccess(module: string): boolean {
  const { data } = useMyPermissions()
  if (!data) return true // pendant le chargement : optimiste (PermissionGate gère)
  return data.find((p) => p.module === module)?.canAccess ?? false
}

export function useCanWrite(module: string): boolean {
  const { data } = useMyPermissions()
  if (!data) return false
  return data.find((p) => p.module === module)?.canWrite ?? false
}
