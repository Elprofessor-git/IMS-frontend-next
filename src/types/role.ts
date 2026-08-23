export type Role = {
  id: number
  name: string
  description: string | null
  estActif: boolean
  estAdministrateur: boolean
  peutGererStock: boolean
  peutGererCommandes: boolean
  peutGererTaches: boolean
  peutGererClients: boolean
  peutGererFournisseurs: boolean
  peutGererAchats: boolean
  peutGererImportations: boolean
  peutGererUtilisateurs: boolean
  peutGererMouvements: boolean
  peutGererPlateformes: boolean
  peutVoirMouvements: boolean
  peutVoirCommandes: boolean
  peutVoirClients: boolean
  peutVoirFournisseurs: boolean
  peutVoirPlateformes: boolean
  peutVoirTaches: boolean
  peutVoirUtilisateurs: boolean
  peutVoirRoles: boolean
  peutValiderStock: boolean
  peutConfirmerAchats: boolean
  peutValiderImportations: boolean
}

export type CreateRolePayload = Omit<Role, 'id' | 'estActif'>
