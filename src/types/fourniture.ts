export type PorteeFourniture = 'Commune' | 'ParTaille'

export type Matelas = {
  id: number
  commandeId: number
  numeroMatelas: string
  dateMatelas: string
  piecePliage: number
  coupeEstimee: number
  notes: string | null
  estActif: boolean
  nombreCoupes: number
}

export type ChaineProduction = {
  id: number
  nom: string
  typeChaine: string
  estActif: boolean
  nombreEnvois: number
  nombreExports: number
}

export type FournitureCommandeLigne = {
  id: number
  commandeId: number
  articleId: number
  articleDesignation: string | null
  portee: PorteeFourniture
  designationSpecifique: string | null
  quantiteFourniture: number
  taille: string | null
  unite: string | null
  notes: string | null
  totalRecu: number
  totalEnvoye: number
}

export type ReceptionFourniture = {
  id: number
  commandeFournitureLigneId: number
  commandeId: number
  articleId: number
  articleDesignation: string | null
  taille: string | null
  quantiteRecue: number
  dateReception: string
  effectuePar: string | null
  notes: string | null
}

export type EnvoiFourniture = {
  id: number
  commandeFournitureLigneId: number
  commandeId: number
  articleId: number
  articleDesignation: string | null
  taille: string | null
  chaineProductionId: number | null
  chaineProductionNom: string | null
  quantiteEnvoyee: number
  dateEnvoi: string
  effectuePar: string | null
  forcerDepassement: boolean
  notes: string | null
}

export type RapportFournitureArticle = {
  commandeFournitureLigneId: number
  articleId: number
  articleDesignation: string
  taille: string | null
  portee: PorteeFourniture
  quantiteParPiece: number
  unite: string | null
  besoinCalcule: number
  totalRecu: number
  totalEnvoye: number
  ecart: number
}

export type RapportFournitureChaine = {
  chaineProductionId: number | null
  chaineProductionNom: string | null
  taille: string
  piècesExportees: number
  fournituresAttendues: number
  fournituresEnvoyees: number
  ecart: number
}

export type RapportFournitures = {
  commandeId: number
  numeroCommande: string
  totalMatelas: number
  totalPiecesCoupees: number
  articles: RapportFournitureArticle[]
  parChaine: RapportFournitureChaine[]
}

// ─── Payloads ───

export type CreerMatelasPayload = {
  numeroMatelas: string
  dateMatelas?: string | null
  piecePliage?: number
  coupeEstimee?: number
  notes?: string | null
}

export type CreerNomenclaturePayload = {
  articleId: number
  portee: PorteeFourniture
  designationSpecifique?: string | null
  quantiteFourniture: number
  taille?: string | null
  unite?: string | null
  notes?: string | null
}

export type ModifierNomenclaturePayload = Partial<CreerNomenclaturePayload>

export type CreerReceptionPayload = {
  commandeFournitureLigneId: number
  quantiteRecue: number
  dateReception?: string | null
  effectuePar?: string | null
  notes?: string | null
}

export type CreerEnvoiPayload = {
  commandeFournitureLigneId: number
  chaineProductionId?: number | null
  quantiteEnvoyee: number
  dateEnvoi?: string | null
  effectuePar?: string | null
  forcerDepassement?: boolean
  notes?: string | null
}

export type DepassementWarning = {
  avertissement?: boolean
  totalRecu?: number
  totalEnvoyeExistant?: number
  depassement?: number
  message?: string
}