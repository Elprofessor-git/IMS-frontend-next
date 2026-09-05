export type TypeDocument =
  | 'Facture'
  | 'BonLivraison'
  | 'ListeColisage'
  | 'Autre'
  | 'BonCommandeProduction'

export type DocumentJoint = {
  id: number
  type: TypeDocument
  nomFichier: string
  contentType: string
  tailleOctets: number
  dateAjout: string
  ajoutePar: string | null
  nature: string | null
}
