import type { ApiError, ValidationProblemDetails } from '@/types'

// Toutes les requêtes client passent par le proxy Next.js (contourne le CORS en dev,
// inutile en prod Vercel où l'origine est whitelistée côté backend).
const PROXY_BASE = '/api/proxy'

async function parseError(response: Response): Promise<ApiError> {
  const { status } = response

  // 401 : corps toujours vide côté backend (return Unauthorized() sans body)
  if (status === 401) {
    return { status: 401, message: 'Session expirée. Veuillez vous reconnecter.' }
  }

  if (status === 400) {
    try {
      const data = await response.json()
      // BadRequest("string") → corps = JSON string brute (pas un objet)
      if (typeof data === 'string') {
        return { status: 400, message: data }
      }
      const problem = data as ValidationProblemDetails
      const firstError = problem.errors
        ? Object.values(problem.errors).flat()[0]
        : problem.title
      return { status: 400, message: firstError ?? problem.title ?? 'Requête invalide.', errors: problem.errors }
    } catch {
      return { status: 400, message: 'Requête invalide.' }
    }
  }

  try {
    const text = await response.text()
    return { status, message: text || `Erreur ${status}` }
  } catch {
    return { status, message: `Erreur ${status}` }
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${PROXY_BASE}${path}`

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    await fetch('/api/session', { method: 'DELETE' }).catch(() => {})
    window.location.href = '/login?expired=1'
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const apiClient = {
  get:   <T>(path: string) => request<T>('GET', path),
  post:  <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put:   <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del:   <T>(path: string) => request<T>('DELETE', path),
}
