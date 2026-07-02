import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

type HealthApiResponse = {
  status: 'available' | 'unavailable' | 'error'
}

type ChatApiResponse = {
  response: string
  sessionId: string
  timestamp: string
  success: boolean
  error?: string
}

type SendMessageParams = {
  message: string
  sessionId: string
  history: { role: 'user' | 'assistant'; content: string }[]
}

export function useChatbotHealth() {
  return useQuery({
    queryKey: ['chatbot', 'health'],
    queryFn: () => apiClient.get<HealthApiResponse>('/api/Chatbot/health'),
    staleTime: 60_000,
    retry: false,
  })
}

export function useSendChatMessage() {
  return useMutation({
    mutationFn: (params: SendMessageParams) =>
      apiClient.post<ChatApiResponse>('/api/Chatbot/chat', params),
  })
}
