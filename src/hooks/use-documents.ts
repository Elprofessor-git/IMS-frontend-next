'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { DocumentJoint, TypeDocument } from '@/types/document'
import type { ApiError } from '@/types'

const PROXY_BASE = '/api/proxy'

function docKey(scope: 'achat' | 'importation', parentId: number) {
  return ['documents', scope, parentId] as const
}

function entityPath(scope: 'achat' | 'importation', parentId: number) {
  return scope === 'achat' ? `/api/Achat/${parentId}` : `/api/Importation/${parentId}`
}

export function useGetDocuments(scope: 'achat' | 'importation', parentId: number) {
  return useQuery<DocumentJoint[]>({
    queryKey: docKey(scope, parentId),
    queryFn: () => apiClient.get<DocumentJoint[]>(`${entityPath(scope, parentId)}/Documents`),
    enabled: parentId > 0,
  })
}

export function useUploadDocument(scope: 'achat' | 'importation', parentId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: TypeDocument }) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)

      // No Content-Type header — browser sets multipart/form-data with boundary automatically.
      // The proxy forwards this header to the backend unchanged (fixed earlier).
      const res = await fetch(`${PROXY_BASE}${entityPath(scope, parentId)}/Documents`, {
        method: 'POST',
        body: fd,
      })

      if (res.status === 401) {
        await fetch('/api/session', { method: 'DELETE' }).catch(() => {})
        window.location.href = '/login?expired=1'
        throw new Error('Session expirée')
      }

      if (!res.ok) {
        const ct = res.headers.get('content-type') ?? ''
        if (ct.includes('application/json')) {
          const data = await res.json().catch(() => null)
          const msg = typeof data === 'string' ? data : (data?.message ?? `Erreur ${res.status}`)
          throw new Error(msg)
        }
        const text = await res.text().catch(() => '')
        throw new Error(text || `Erreur ${res.status}`)
      }

      return res.json() as Promise<DocumentJoint>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: docKey(scope, parentId) })
      toast.success('Document ajouté')
    },
    onError: (err: Error) =>
      toast.error(err.message ?? 'Erreur lors de l\'upload'),
  })
}

export function useDeleteDocument(scope: 'achat' | 'importation', parentId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: number) =>
      apiClient.del<void>(`${entityPath(scope, parentId)}/Documents/${docId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: docKey(scope, parentId) })
      toast.success('Document supprimé')
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? 'Erreur lors de la suppression'),
  })
}
