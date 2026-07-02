export type TypeMouvementValue = 0 | 1 | 2 | 3 | 4 | 5
export type OrigineMouvementValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export const TYPE_MOUVEMENT: Record<TypeMouvementValue, string> = {
  0: 'Entrée',
  1: 'Sortie',
  2: 'Transfert',
  3: 'Ajustement',
  4: 'Réservation',
  5: 'Libération',
}

export const ORIGINE_MOUVEMENT: Record<OrigineMouvementValue, string> = {
  0: 'Manuel',
  1: 'Achat',
  2: 'Importation',
  3: 'Commande client',
  4: 'Inventaire',
  5: 'Retour',
  6: 'Transfert',
  7: 'Système',
}

export type MouvementArticle = {
  id: number
  designation: string
  reference: string | null
}

export type MouvementStock = {
  id: number
  stockId: number
  articleId: number
  typeMouvement: TypeMouvementValue
  origineMouvement: OrigineMouvementValue
  quantite: number
  stockAvant: number
  stockApres: number
  motif: string | null
  numeroReference: string | null
  emplacementSource: string | null
  emplacementDestination: string | null
  effectuePar: string
  dateMouvement: string
  article: MouvementArticle | null
}

export type TransfertPayload = {
  stockSourceId: number
  stockDestinationId: number
  quantite: number
  motif: string
  effectuePar: string
}

export type TransfertResponse = {
  message: string
  mouvementSortieId: number
  mouvementEntreeId: number
}

export type MouvementStatistiques = {
  totalEntrees: number
  totalSorties: number
  totalTransferts: number
  totalAjustements: number
  stockValeurTotale: number
  quantiteTotaleEntree: number
  quantiteTotaleSortie: number
}

export type FiltrerParams = {
  dateDebut?: string
  dateFin?: string
  typeMouvement?: number
  origineMouvement?: number
  articleId?: number
  effectuePar?: string
}
