// Statut facture : 0=Brouillon 1=Emise 2=Payee 3=Annulee (enum C# StatutFacture)
export const STATUT_FACTURE_LABELS: Record<number, string> = {
  0: 'Brouillon',
  1: 'Émise',
  2: 'Payée',
  3: 'Annulée',
}

export type FactureLigne = {
  id: number
  factureId: number
  commandeId: number
  modele: string | null
  numeroCommande: string
  quantite: number
  prixUnitaireFacon: number
  montantLigne: number
}

export type FactureListDto = {
  id: number
  numeroFacture: string
  dateFacture: string
  clientId: number
  clientNom: string | null
  devise: string | null
  montantTotal: number
  statut: number
}

export type FactureDetail = FactureListDto & {
  clientAdresse: string | null
  modePaiement: string | null
  rib: string | null
  iban: string | null
  modeLivraison: string | null
  nombreColis: number | null
  poidsNetKg: number | null
  poidsBrutKg: number | null
  volumeM3: number | null
  notes: string | null
  dateCreation: string
  creePar: string | null
  lignes: FactureLigne[]
}

export type FactureLigneInput = {
  commandeId: number
  quantite: number
  prixUnitaireFacon: number
}

export type CreateFacturePayload = {
  dateFacture?: string | null
  clientId: number
  devise?: string | null
  modePaiement?: string | null
  rib?: string | null
  iban?: string | null
  modeLivraison?: string | null
  nombreColis?: number | null
  poidsNetKg?: number | null
  poidsBrutKg?: number | null
  volumeM3?: number | null
  notes?: string | null
  lignes: FactureLigneInput[]
}

export type UpdateFacturePayload = {
  dateFacture?: string | null
  devise?: string | null
  modePaiement?: string | null
  rib?: string | null
  iban?: string | null
  modeLivraison?: string | null
  nombreColis?: number | null
  poidsNetKg?: number | null
  poidsBrutKg?: number | null
  volumeM3?: number | null
  notes?: string | null
  lignes: FactureLigneInput[]
}