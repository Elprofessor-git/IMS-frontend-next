export const STATUT_COMMANDE: Record<number, string> = {
  0: 'En attente',
  1: 'Prête',
  2: 'En production',
  3: 'Terminée',
  4: 'Annulée',
}

export const TYPE_BESOIN: Record<number, string> = {
  0: 'Matière première',
  1: 'Accessoire',
  2: 'Emballage',
  3: 'Autre',
}

export type BesoinCommande = {
  id: number
  commandeClientId: number
  articleId: number
  typeBesoin: number
  couleur: string | null
  taille: string | null
  dimension: string | null
  quantiteUnitaire: number
  nombrePieces: number
  // Calculé par le backend : quantiteUnitaire × nombrePieces
  quantiteTotale: number
  // Mis à jour par ValiderRessources
  quantiteCouverte: number
  quantiteStockImporte: number
  quantiteAchatsLocaux: number
  quantiteStockLibre: number
  estCompletementCouvert: boolean
  notes: string | null
  dateCreation: string
  article: { id: number; designation: string; reference: string | null } | null
}

export type ConfigTaille = {
  id: number
  commandeId: number
  taille: string
  quantite: number
}

export type BomLigne = {
  id: number
  commandeId: number
  articleId: number
  quantiteParPiece: number
  unite: string | null
  estConsommableTissu: boolean
  article: { id: number; designation: string; reference: string | null; laize: number | null } | null
}

export type ResultatCalcul = {
  id: number
  commandeId: number
  articleId: number
  besoinBrut: number
  margeAppliquee: number
  besoinFinal: number
  qteAchat: number
  qteImport: number
  qteStockReserve: number
  qteDisponible: number
  manque: number
  estSuffisant: boolean
  dateCalcul: string
  article: { id: number; designation: string; reference: string | null } | null
}

export type CommandeClient = {
  id: number
  numeroCommande: string
  clientId: number
  titreCommande: string | null
  descriptionCommande: string | null
  dateCommande: string
  dateLivraisonSouhaitee: string | null
  statut: number // 0=EnAttente 1=Prete 2=EnProduction 3=Terminee 4=Annulee
  montantTotal: number
  devise: string | null
  pourcentageRessourcesCouvertes: number
  prixFacon: number | null
  notesSpeciales: string | null
  specificationsClient: string | null
  dateCreation: string
  dateMiseAJour: string | null
  creePar: string | null
  modifiePar: string | null
  client: { id: number; nom: string; plateforme?: { id: number; nom: string } | null } | null
  besoins: BesoinCommande[]
  configTailles: ConfigTaille[]
  bomLignes: BomLigne[]
  resultatsCalcul: ResultatCalcul[]
}

// Réponse exacte de POST /{id}/ValiderRessources
export type ValiderRessourcesResponse = {
  message: string
  pourcentageCouverture: number
  // Attention : statut est un string (C# .ToString()) pas un int
  statut: 'EnAttente' | 'Prete' | 'EnProduction' | 'Terminee' | 'Annulee'
}

// Réponse de POST /{id}/Calculer
export type CalculerResponse = {
  message: string
  totalPieces: number
  lignesCalculees: number
  toutSuffisant: boolean
}

// Payload PUT /api/CommandeClient/{id} : en-tête uniquement (champs modifiables si statut <= 1).
export type UpdateCommandePayload = {
  titreCommande: string | null
  dateLivraisonSouhaitee: string | null
  notesSpeciales: string | null
  prixFacon: number | null
}
