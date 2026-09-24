export type ControleQualite = {
  id: number
  ordreFabricationId: number
  numeroCommande: string
  chaineProductionId: number | null
  chaineNom: string | null
  typeControle: string
  controleParentId: number | null
  envoiRetoucheId: number | null
  taille: string
  quantiteControlee: number
  quantiteAcceptee: number
  quantiteRetouche: number
  quantiteRebut: number
  dateControle: string
  effectuePar: string | null
  notes: string | null
}

export type CreateControleQualiteDefautLignePayload = {
  defautCodeId: number
  quantite: number
  notes?: string | null
}

export type CreateControleQualitePayload = {
  ordreFabricationId: number
  chaineProductionId?: number | null
  typeControle: string
  taille: string
  quantiteControlee: number
  quantiteAcceptee: number
  quantiteRetouche: number
  quantiteRebut: number
  controleParentId?: number | null
  envoiRetoucheId?: number | null
  dateControle?: string | null
  effectuePar?: string | null
  notes?: string | null
  defauts?: CreateControleQualiteDefautLignePayload[]
}

export type ReferenceQualite = {
  tripletOfId: number
  tripletChaineId: number | null
  tripletTaille: string
  quantiteExportee: number
  quantiteControlee: number
  quantiteAcceptee: number
  quantiteRetouche: number
  quantiteRebut: number
  enCours: number
  referenceDisponible: number
  estSolde: boolean
}

export type EnvoiRetouche = {
  id: number
  controleQualiteId: number
  chaineProductionId: number
  chaineNom: string | null
  quantiteRenvoyee: number
  dateEnvoi: string
  effectuePar: string | null
  notes: string | null
}

export type CreateEnvoiRetouchePayload = {
  controleQualiteId: number
  chaineProductionId: number
  quantiteRenvoyee: number
  dateEnvoi?: string | null
  effectuePar?: string | null
  notes?: string | null
}

export type DefautCode = {
  id: number
  code: string
  libelle: string
  estActif: boolean
}

export type CreateDefautCodePayload = {
  code: string
  libelle: string
  estActif?: boolean
}
