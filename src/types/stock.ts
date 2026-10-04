export const TYPE_STOCK: Record<number, string> = {
  0: 'Libre',
  1: 'Réservé',
  2: 'Importé',
}

// `/api/Stock/Liste` renvoie TypeStock sous forme de texte ("Libre"), et non
// sous forme d'enum numérique comme l'entité brute.
export const TYPE_STOCK_LABEL: Record<string, string> = {
  Libre: 'Libre',
  Reserve: 'Réservé',
  Importe: 'Importé',
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
  prixUnitaireTND: number
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

/**
 * Ligne de GET /api/Stock/Liste.
 *
 * PROJETION, pas l'entité : ni prixUnitaire, ni devise, ni notes, ni validePar.
 * Le type le dit explicitement pour qu'un usage ne tente pas de lire un champ
 * qui n'existe pas et ne compense pas en allant chercher /api/Stock.
 */
export type StockListeItem = {
  id: number
  articleId: number
  articleDesignation: string | null
  articleReference: string | null
  articleCategorie: string | null
  seuilAlerte: number
  couleur: string | null
  codeCouleur: string | null
  taille: string | null
  dimension: string | null
  emplacementPhysique: string | null
  numeroLot: string | null
  quantite: number
  quantiteReservee: number
  quantiteDisponible: number
  /** Libellé texte renvoyé par le backend, pas l'enum numérique. */
  typeStock: string
  estValide: boolean
  enAlerte: boolean
  estCritique: boolean
  dateEntree: string
  datePeremption: string | null
  commandeClientId: number | null
  commandeLibelle: string | null
  clientId: number | null
  clientLibelle: string | null
  plateformeId: number | null
  plateformeLibelle: string | null
}

export type StockListeReponse = {
  items: StockListeItem[]
  total: number
  page: number
  taille: number
  pages: number
}

export type StockListeFiltres = {
  page?: number
  taille?: number
  commandeClientId?: number
  clientId?: number
  plateformeId?: number
  typeStock?: string
  categorie?: string
  q?: string
  alertesOnly?: boolean
}
