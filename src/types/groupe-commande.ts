import type { CommandeClient } from './commande'

export interface GroupeCommandeCommande {
  id: number
  groupeCommandeId: number
  commandeClientId: number
  commandeClient?: CommandeClient
}

export interface GroupeCommande {
  id: number
  nom?: string | null
  dateCreation: string | Date
  membres?: GroupeCommandeCommande[]
}
