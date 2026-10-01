'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  CreateShareLinkPayload,
  CreateShareLinkResponse,
  PartagePublic,
  ShareLink,
} from '@/types/partage'
import type { ApiError } from '@/types'

const KEY = ['partages'] as const

export function useGetPartages() {
  return useQuery<ShareLink[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<ShareLink[]>('/api/Partage'),
  })
}

export function useCreatePartage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateShareLinkPayload) =>
      apiClient.post<CreateShareLinkResponse>('/api/Partage', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création du lien'),
  })
}

export function useRevoquerPartage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/Partage/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Lien révoqué')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de révoquer le lien'),
  })
}

// ── Ouverture publique (page /partage) ───────────────────────────────────────
//
// On n'utilise pas apiClient : la page est anonyme et un 401 ne doit pas déclencher
// la redirection vers /login. Le token voyage dans le CORPS, jamais dans l'URL.

export class PartageErreur extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'PartageErreur'
  }
}

export async function ouvrirPartagePublic(token: string): Promise<PartagePublic> {
  let response: Response
  try {
    response = await fetch('/api/proxy/api/Partage/Public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  } catch {
    throw new PartageErreur(503, 'Impossible de joindre le serveur.')
  }

  if (response.status === 404) {
    throw new PartageErreur(404, "Ce lien est invalide, expiré ou a été révoqué.")
  }
  if (response.status === 429) {
    throw new PartageErreur(
      429,
      'Trop de tentatives. Merci de réessayer dans quelques minutes.',
    )
  }
  if (!response.ok) {
    throw new PartageErreur(response.status, "Impossible d'ouvrir ce lien.")
  }

  return (await response.json()) as PartagePublic
}
