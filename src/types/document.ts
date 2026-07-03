export type TypeDocument = 'Facture' | 'BonLivraison' | 'Autre'

export type DocumentJoint = {
  id: number
  type: TypeDocument
  nomFichier: string
  contentType: string
  tailleOctets: number
  dateAjout: string
  ajoutePar: string | null
}
