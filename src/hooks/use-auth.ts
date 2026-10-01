'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CurrentUser } from '@/types'

export const AUTH_KEY = ['me'] as const

export function useAuth() {
  return useQuery<CurrentUser>({
    queryKey: AUTH_KEY,
    queryFn: () => apiClient.get<CurrentUser>('/api/Auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
