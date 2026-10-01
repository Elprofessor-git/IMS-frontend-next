export type User = {
  id: string          // GUID Identity
  nom: string
  prenom: string | null
  email: string
  role: string | null   // rôle Identity (ex: "Admin")
  roleId: number | null // ID du rôle personnalisé (AppRoles)
  nomRole: string | null // nom du rôle personnalisé
  estAdministrateur: boolean // true si le rôle personnalisé est EstAdministrateur
  estActif: boolean
  dateCreation: string
}

/**
 * Corps de POST /api/Auth/register.
 *
 * Aucun mot de passe : l'endpoint est une INVITATION. Le compte est créé sans
 * `PasswordHash` et un lien « choisir mon mot de passe » est envoyé par email — un
 * mot de passe choisi ou transmis par un administrateur reviendrait à demander au
 * compte de le changer, et le premier facteur ne serait jamais connu de la personne
 * concernée.
 */
export type InviteUserPayload = {
  nom: string
  prenom?: string
  email: string
  roleId?: number
}
