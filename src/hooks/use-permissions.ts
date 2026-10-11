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

/**
 * Droit d'assigner une tâche à un autre utilisateur. Fermé par défaut tant que
 * la réponse n'est pas chargée (on ne déclenche pas l'appel à l'annuaire à tort).
 */
export function useCanAssignerTaches(): boolean {
  const { data } = useMyPermissions()
  if (!data || data.length === 0) return false
  return data[0].peutAssignerTaches ?? false
}

/**
 * Droit d'utiliser la messagerie interne (module Discussion). Fermé par défaut
 * tant que la réponse n'est pas chargée : on ne sonde pas /sync sans le drapeau.
 */
export function useCanUtiliserDiscussion(): boolean {
  const { data } = useMyPermissions()
  if (!data || data.length === 0) return false
  return data[0].peutUtiliserDiscussion ?? false
}

/**
 * Modération des canaux PUBLICS. Fermé par défaut : n'ouvre que la création d'un
 * canal public, jamais l'accès à la page (régi par le module « discussion »).
 */
export function useCanGererDiscussion(): boolean {
  const { data } = useMyPermissions()
  if (!data || data.length === 0) return false
  return data[0].peutGererDiscussion ?? false
}
