'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Devise } from '@/types/Devise'

const QUERY_KEY = ['devises'] as const

export function useGetDevises() {
  return useQuery<Devise[]>({
    queryKey: QUERY_KEY,
    queryFn: () => apiClient.get<Devise[]>('/api/Devise'),
  })
}
