'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { User } from '@/types'

export const AUTH_KEY = ['me'] as const

export function useAuth() {
  return useQuery<User>({
    queryKey: AUTH_KEY,
    queryFn: () => apiClient.get<User>('/api/Auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
