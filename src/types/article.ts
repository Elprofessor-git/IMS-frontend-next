export type StockBrief = {
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
}

export type Article = {
  id: number
  designation: string
  description: string | null
  categorie: string | null
  sousCategorie: string | null
  unite: string | null
  marque: string | null
  reference: string | null
  caracteristiques: string | null
  prixUnitaireMoyen: number
  seuilAlerte: number
  seuilCritique: number
  dateCreation: string
  estActif: boolean
  imageUrl: string | null
  stocks: StockBrief[]
}

export type ArticleStockTotal = {
  articleId: number
  quantiteTotale: number
  quantiteReservee: number
  quantiteDisponible: number
}

export type PaginatedResponse<T> = {
  data: T[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
}
