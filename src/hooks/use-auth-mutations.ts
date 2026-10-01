'use client'

import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { ApiError } from '@/types'

/**
 * Mutations d'authentification hors session (email reçu, pas de cookie).
 *
 * Volontairement hors `api-client.ts` : ce client redirige vers /login et efface le
 * cookie dès qu'il reçoit un 401 — comportement correct pour une session expirée,
 * mais faux ici, où un 401 (mot de passe actuel incorrect) est une réponse métier
 * à afficher dans le formulaire. Ces trois appels ne passent donc pas par lui.
 *
 * Aucun stockage de token : ces mutations n'en produisent pas.
 */

const MESSAGES = {
  network: 'Erreur réseau. Veuillez réessayer.',
} as const

function messageErreur(err: unknown, defaut: string): string {
  if (err instanceof TypeError) return MESSAGES.network
  const api = err as Partial<ApiError> | null
  return api?.message ?? defaut
}

/** Demande de lien de réinitialisation. Réponse identique compte existe ou non. */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ message: string }>('/api/Auth/forgot-password', { email }),
  })
}

/** Consommation du lien reçu par email (POST /api/Auth/reset-password). */
export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { userId: string; token: string; nouveauMotDePasse: string; confirmation: string }) =>
      apiClient.post<{ message: string }>('/api/Auth/reset-password', data),
  })
}

/** Changement de mot de passe, session ouverte (POST /api/Auth/change-password). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { ancienMotDePasse: string; nouveauMotDePasse: string; confirmation: string }) =>
      apiClient.post<{ message: string }>('/api/Auth/change-password', data),
  })
}

export { messageErreur as messageErreurAuth }
