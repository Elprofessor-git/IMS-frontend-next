export type Devise = {
  code: string
  nom: string
  symbole: string
  estActif: boolean
}

export type TauxChange = {
  id: number
  deviseCode: string
  deviseNom?: string
  deviseSymbole?: string
  dateEffective: string
  taux: number
}
