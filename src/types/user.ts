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
