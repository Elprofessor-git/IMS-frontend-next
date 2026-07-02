import type { Plateforme } from './plateforme'

// StatutCommande sérialisé en entier par le backend (pas de JsonStringEnumConverter)
export const STATUT_COMMANDE: Record<number, string> = {
  0: 'En attente',
  1: 'Prête',
  2: 'En production',
  3: 'Terminée',
  4: 'Annulée',
}

export const STATUT_COMMANDE_VARIANT: Record<number, 'default' | 'secondary' | 'outline'> = {
  0: 'secondary',
  1: 'outline',
  2: 'default',
  3: 'default',
  4: 'secondary',
}

export type Client = {
  id: number
  nom: string
  prenom: string | null
  nomEntreprise: string | null
  email: string
  telephone: string | null
  adresse: string | null
  ville: string | null
  codePostal: string | null
  pays: string | null
  preferencesTissus: string | null
  notesHistorique: string | null
  dateCreation: string
  estActif: boolean
  plateformeId: number
  // Présent en GET liste et détail (cycle brisé : plateforme.clients = [])
  plateforme: Plateforme | null
  // Présent uniquement en GET détail /{id}
  commandes: CommandeSummary[]
}

export type CommandeSummary = {
  id: number
  numeroCommande: string
  titreCommande: string | null
  dateCommande: string
  statut: number
  montantTotal: number
  devise: string | null
}

export type ClientHistorique = {
  // Vient de FindAsync (sans Include) — plateforme: null, commandes: []
  client: Client
  commandes: CommandeSummary[]
  statistiques: {
    nombreCommandes: number
    montantTotal: number
    commandesTerminees: number
    derniereCommande: string | null
  }
}
