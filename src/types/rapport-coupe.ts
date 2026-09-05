export type LotCoupe = {
  id: number
  commandeId: number
  taille: string
  quantiteCoupee: number
  dateCoupe: string
  effectuePar: string | null
  forcerDepassement: boolean
  notes: string | null
}

export type LotExport = {
  id: number
  commandeId: number
  taille: string
  quantiteExportee: number
  dateExport: string
  effectuePar: string | null
  forcerDepassement: boolean
  notes: string | null
}

export type RapportCoupeTaille = {
  taille: string
  quantiteCommande: number
  quantiteCoupee: number
  quantiteExportee: number
  depassementCoupe: boolean
  depassementExport: boolean
}

export type RapportCoupeTissu = {
  articleId: number
  designation: string
  laize: number | null
  metrageAnnonce: number
  quantiteCoupee: number
  consoReelle: number
  metrageReelle: number
  stockRestant: number
}

export type RapportCoupe = {
  commandeId: number
  numeroCommande: string
  titreCommande: string | null
  clientNom: string | null
  totalQuantiteCommande: number
  totalQuantiteCoupee: number
  totalQuantiteExportee: number
  tailles: RapportCoupeTaille[]
  tissus: RapportCoupeTissu[]
}

export type CreerLotPayload = {
  taille: string
  quantiteCoupee?: number
  quantiteExportee?: number
  forcerDepassement?: boolean
  notes?: string | null
}