export type AuthResponse = {
  token: string
}

export type User = {
  id: string
  email: string
  nom: string
  prenom: string
  roles: string[]
  estAdministrateur?: boolean
  estActif: boolean
}

/**
 * Utilisateur connecté tel que renvoyé par GET /api/Auth/me.
 *
 * distinct de `User` (liste /utilisateurs) : ici `role` est le LIBELLE du rôle courant
 * et non un tableau. Les champs optionnels sont absents de la réponse pour un compte
 * sans rôle, d'où le `| null` plutôt qu'un simple `?`.
 */
export type CurrentUser = {
  id: string
  email: string
  nom: string
  prenom: string
  role: string | null
  roleId: number | null
  estAdministrateur: boolean
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
  data?: Record<string, unknown>
}
