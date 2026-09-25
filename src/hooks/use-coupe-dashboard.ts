'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CoupeDashboard } from '@/types/coupe-dashboard'

const KEY = ['coupe', 'dashboard'] as const

/**
 * Avancement de la coupe PAR COMMANDE (tableau de bord /coupe).
 * Les agrégats viennent du backend et partent des COMMANDES : une commande sans
 * aucun matelas y figure (planifié 0, reste à planifier = demande), ce qu'un
 * calcul frontend depuis /api/Matelas ne peut pas faire.
 */
export function useGetCoupeDashboard() {
  return useQuery<CoupeDashboard>({
    queryKey: KEY,
    queryFn: () => apiClient.get<CoupeDashboard>('/api/Coupe/Dashboard'),
    retry: false,
  })
}
