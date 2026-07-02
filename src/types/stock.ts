export const TYPE_STOCK: Record<number, string> = {
  0: 'Libre',
  1: 'Réservé',
  2: 'Importé',
}

export type StockArticle = {
  id: number
  designation: string
  reference: string | null
  categorie: string | null
  unite: string | null
  seuilAlerte: number
  seuilCritique: number
}

export type Stock = {
  id: number
  articleId: number
  couleur: string | null
  codeCouleur: string | null
  taille: string | null
  dimension: string | null
  emplacementPhysique: string | null
  numeroLot: string | null
  quantite: number
  quantiteReservee: number
  typeStock: number // 0=Libre 1=Reserve 2=Importe
  commandeClientId: number | null
  prixUnitaire: number
  devise: string | null
  dateEntree: string
  datePeremption: string | null
  notes: string | null
  validationManuelleRequise: boolean
  estValide: boolean
  validePar: string | null
  dateValidation: string | null
  article: StockArticle
}

export type AlerteStock = {
  id: number
  designation: string
  quantite: number
  seuilAlerte: number
  seuilCritique: number
  estCritique: boolean // champ exact du backend — pas recalculé frontend
}
