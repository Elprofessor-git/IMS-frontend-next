export type OrdreFabrication = {
  id: number
  commandeId: number
  numeroOF: string
  chaineProductionId: number | null
  chaineProductionNom: string | null
  dateCreation: string
  notes: string | null
  totalPieces: number
  nombreLignesTailles: number
  nombreEtiquettes: number
}

export type OrdreFabricationDetail = OrdreFabrication & {
  tailles: OrdreFabricationTailleLigne[]
  etiquettes: OrdreFabricationEtiquette[]
  matelas: OrdreFabricationMatelas[]
}

export type OrdreFabricationTailleLigne = {
  id: number
  ordreFabricationId: number
  taille: string
  quantite: number
}

export type OrdreFabricationEtiquette = {
  id: number
  ordreFabricationId: number
  fournitureCommandeLigneId: number | null
  fournitureDesignation: string | null
  taille: string | null
  quantiteEtiquettes: number
  dateImpression: string
  effectuePar: string | null
  notes: string | null
}

export type OrdreFabricationMatelas = {
  id: number
  numeroMatelas: string
  dateMatelas: string
  piecePliage: number
  coupeEstimee: number
  quantiteCoupee: number
}

export type OrdreFabricationWriteResponse = {
  message: string
  id: number
  avertissementCohérence: string | null
}

export type CreateOrdreFabricationPayload = {
  commandeId: number
  numeroOF: string
  chaineProductionId?: number | null
  notes?: string | null
}

export type UpdateOrdreFabricationPayload = Partial<Omit<CreateOrdreFabricationPayload, 'commandeId'>>

export type SaisieTaillePayload = {
  taille: string
  quantite: number
}

export type CreateEtiquettePayload = {
  fournitureCommandeLigneId?: number | null
  taille?: string | null
  quantiteEtiquettes: number
  dateImpression?: string | null
  effectuePar?: string | null
  notes?: string | null
}