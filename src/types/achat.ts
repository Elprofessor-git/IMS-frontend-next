// STATUT_ACHAT est dans fournisseur.ts (partagé avec le module Fournisseurs)
export type { } from '@/types/fournisseur'

export type LigneAchatArticle = {
  id: number
  designation: string
  reference: string | null
}

export type LigneAchat = {
  id: number
  achatId: number
  articleId: number
  couleur: string | null
  codeCouleur: string | null
  taille: string | null
  dimension: string | null
  quantite: number
  prixUnitaire: number
  montantLigne: number
  devise: string | null
  descriptionSpecifique: string | null
  notes: string | null
  dateCreation: string
  article: LigneAchatArticle | null
}

export type AchatFournisseur = {
  id: number
  nomEntreprise: string
}

export type AchatCommandeClient = {
  id: number
  numeroCommande: string | null
  client: {
    id: number
    nom: string
    plateforme?: { id: number; nom: string } | null
  } | null
}

export type Achat = {
  id: number
  numeroAchat: string
  fournisseurId: number
  commandeClientId: number
  statut: number // 0=Brouillon 1=Soumis 2=Confirme 3=Livre 4=Annule
  dateAchat: string
  dateLivraisonPrevue: string | null
  dateLivraisonReelle: string | null
  montantTotal: number
  devise: string | null
  conditionsPaiement: string | null
  notesAchat: string | null
  cheminPDF: string | null
  historiqueModifications: string | null
  justificatifAnnulation: string | null
  dateCreation: string
  dateMiseAJour: string | null
  creePar: string | null
  modifiePar: string | null
  fournisseur: AchatFournisseur | null
  commandeClient: AchatCommandeClient | null
  lignesAchat: LigneAchat[]
}
