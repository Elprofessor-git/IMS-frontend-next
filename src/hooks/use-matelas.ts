'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { MatelasGlobal } from '@/types/matelas'

export function useGetMatelas() {
  return useQuery({
    queryKey: ['matelas'],
    queryFn: () => apiClient.get<MatelasGlobal[]>('/api/Matelas'),
  })
}

export const KEY_MATELAS = ['matelas'] as const
