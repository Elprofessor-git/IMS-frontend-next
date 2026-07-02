export type User = {
  id: string          // GUID Identity
  nom: string
  prenom: string | null
  email: string
  role: string | null   // rôle Identity (ex: "Admin")
  roleId: number | null // ID du rôle personnalisé (AppRoles)
  nomRole: string | null // nom du rôle personnalisé
  estActif: boolean
  dateCreation: string
}
