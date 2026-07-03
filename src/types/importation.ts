// STATUT_IMPORTATION et MODE_EXPEDITION sont dans fournisseur.ts (partagés)

export type LigneImportationArticle = {
  id: number
  designation: string
  reference: string | null
}

export type LigneImportation = {
  id: number
  importationId: number
  articleId: number
  commandeClientId: number | null
  clientId: number | null
  plateformeId: number | null
  designation: string | null
  couleur: string | null
  codeCouleur: string | null
  dimension: string | null
  nature: string | null
  quantite: number
  prixUnitaire: number
  montantLigne: number
  devise: string | null
  notes: string | null
  estAffecteStock: boolean
  typeOrigine: 'Fournisseur' | 'ClientCMT'
  typeDestination: 'Commande' | 'Marque' | 'Plateforme' | 'StockLibre'
  dateCreation: string
  article: LigneImportationArticle | null
  commandeClient: { id: number } | null
}

export type DocumentImportation = {
  id: number
  importationId: number
  nomFichier: string
  cheminFichier: string
  typeFichier: string | null
  tailleOctets: number
  dateAjout: string
  ajoutePar: string | null
}

export type ImportationFournisseur = {
  id: number
  nomEntreprise: string
}

export type Importation = {
  id: number
  referenceImportation: string
  fournisseurId: number | null
  statut: number // 0=Brouillon 1=Soumise 2=Validee 3=Recue 4=Annulee
  dateImportation: string
  dateReceptionPrevue: string | null
  dateReceptionReelle: string | null
  modeExpedition: number // 0=Maritime 1=Aerien 2=Terrestre 3=Express 4=Autre
  montantTotal: number
  devise: string | null
  cheminFacture: string | null
  cheminBonLivraison: string | null
  cheminCertificatDouane: string | null
  notesImportation: string | null
  historiqueModifications: string | null
  dateCreation: string
  dateMiseAJour: string | null
  creePar: string | null
  modifiePar: string | null
  fournisseur: ImportationFournisseur | null
  lignesImportation: LigneImportation[]
  documents: DocumentImportation[]
}
