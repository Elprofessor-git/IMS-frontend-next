export type AuthResponse = {
  token: string
}

export type User = {
  id: string
  email: string
  nom: string
  prenom: string
  roles: string[]
  estActif: boolean
}

// Format exact retourné par ASP.NET [ApiController] sur validation 400
export type ValidationProblemDetails = {
  type: string
  title: string
  status: number
  traceId?: string
  errors?: Record<string, string[]>
}

export type ApiError = {
  status: number
  message: string
  errors?: Record<string, string[]>
}
