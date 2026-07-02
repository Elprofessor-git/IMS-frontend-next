// Enums sérialisés en entier par le backend (pas de JsonStringEnumConverter)
export const STATUT_ACHAT: Record<number, string> = {
  0: 'Brouillon',
  1: 'Soumis',
  2: 'Confirmé',
  3: 'Livré',
  4: 'Annulé',
}

export const STATUT_IMPORTATION: Record<number, string> = {
  0: 'Brouillon',
  1: 'Soumise',
  2: 'Validée',
  3: 'Reçue',
  4: 'Annulée',
}

export const MODE_EXPEDITION: Record<number, string> = {
  0: 'Maritime',
  1: 'Aérien',
  2: 'Terrestre',
  3: 'Express',
  4: 'Autre',
}

export type Fournisseur = {
  id: number
  nomEntreprise: string
  personneContact: string | null
  email: string
  telephone: string | null
  adresse: string | null
  ville: string | null
  codePostal: string | null
  pays: string | null
  specialitesProduits: string | null
  conditionsPaiement: string | null
  delaiLivraisonJours: number
  notesContrat: string | null
  dateCreation: string
  estActif: boolean
  // [] dans la liste (sans Include), chargé dans le détail GET /{id}
  achats: AchatRef[]
  importations: ImportationRef[]
}

export type AchatRef = {
  id: number
  numeroAchat: string
  statut: number
  montantTotal: number
  devise: string | null
}

export type ImportationRef = {
  id: number
  referenceImportation: string
  statut: number
  montantTotal: number
  devise: string | null
}

// Projections spécifiques à GET /{id}/Historique (clés camelCase, champs exacts)
export type AchatHistoriqueItem = {
  id: number
  numeroAchat: string
  dateAchat: string
  statut: number
  montantTotal: number
  devise: string | null
  commandeClient: string // NumeroCommande (string, pas objet)
  client: string         // Nom client (string, pas objet)
}

export type ImportationHistoriqueItem = {
  id: number
  referenceImportation: string
  dateImportation: string
  statut: number
  montantTotal: number
  devise: string | null
  modeExpedition: number
}

export type FournisseurHistorique = {
  fournisseur: Fournisseur
  achats: AchatHistoriqueItem[]
  importations: ImportationHistoriqueItem[]
  statistiques: {
    nombreAchats: number
    nombreImportations: number
    montantTotalAchats: number
    montantTotalImportations: number
    dernierAchat: string | null
    derniereImportation: string | null
  }
}
