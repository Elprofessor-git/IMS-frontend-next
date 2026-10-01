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

/**
 * Droit de créer des liens de partage. Capacité transversale : répétée sur chaque
 * entrée par l'API, il suffit de lire la première. Fermé par défaut tant que la
 * réponse n'est pas chargée (on ne fait pas clignoter un bouton privilégié).
 */
export function useCanPartagerLiens(): boolean {
  const { data } = useMyPermissions()
  if (!data || data.length === 0) return false
  return data[0].peutPartagerLiens ?? false
}
