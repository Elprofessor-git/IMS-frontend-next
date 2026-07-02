'use client'

import { useMyPermissions } from '@/hooks/use-permissions'

interface PermissionGateProps {
  module: string
  mode: 'read' | 'write'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({
  module,
  mode,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { data: permissions, isLoading } = useMyPermissions()

  if (isLoading) return null

  const perm = permissions?.find((p) => p.module === module)
  const allowed = mode === 'read' ? (perm?.canAccess ?? false) : (perm?.canWrite ?? false)

  if (!allowed) return <>{fallback}</>
  return <>{children}</>
}
