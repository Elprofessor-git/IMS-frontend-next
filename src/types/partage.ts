// Contrat de l'API de partage. Aucune valeur monétaire n'y figure jamais :
// les projections publiques sont volontairement dépourvues de prix/notes.

// ShareLinkScopeType (backend) — sérialisé en nombre.
export const SHARE_SCOPE_TYPE = {
  Plateforme: 1,
  Marque: 2,
  Commande: 3,
} as const
export type ShareScopeTypeId = (typeof SHARE_SCOPE_TYPE)[keyof typeof SHARE_SCOPE_TYPE]

export const SHARE_SCOPE_LABEL: Record<number, string> = {
  1: 'Plateforme',
  2: 'Marque (client)',
  3: 'Commande',
}

// ShareLinkSection — drapeaux binaires.
export const SHARE_SECTION = {
  Stock: 1,
  Commandes: 2,
  Importations: 4,
} as const

export const SHARE_SECTION_OPTIONS = [
  { value: SHARE_SECTION.Stock, label: 'Stock' },
  { value: SHARE_SECTION.Commandes, label: 'Commandes' },
  { value: SHARE_SECTION.Importations, label: 'Importations' },
] as const

export type ShareLinkFilters = {
  article?: string | null
  couleur?: string | null
  taille?: string | null
  statut?: string | null
  dateDebut?: string | null
  dateFin?: string | null
}

export type ShareLink = {
  id: number
  label: string | null
  scopeType: number
  scopeId: number
  scopeLibelle: string
  sections: number
  isStockLibreAllowed: boolean
  filters: ShareLinkFilters | null
  createdAtUtc: string
  expiresAtUtc: string
  revokedAtUtc: string | null
  useCount: number
  maxUses: number | null
  actif: boolean
}

export type CreateShareLinkPayload = {
  scopeType: number
  scopeId: number
  sections: number
  dureeHeures: number
  maxUses: number | null
  isStockLibreAllowed: boolean
  filters: ShareLinkFilters | null
  label: string | null
}

export type CreateShareLinkResponse = {
  link: ShareLink
  token: string
}

// ── Réponse publique ──────────────────────────────────────────────────────────

export type PartageStock = {
  id: number
  articleDesignation: string | null
  articleReference: string | null
  couleur: string | null
  taille: string | null
  dimension: string | null
  emplacementPhysique: string | null
  quantite: number
  quantiteReservee: number
  typeStock: string
}

export type PartageCommande = {
  id: number
  numeroCommande: string
  titreCommande: string | null
  statut: string
  dateLivraisonSouhaitee: string | null
  clientNom: string | null
}

export type PartageImportation = {
  id: number
  referenceImportation: string
  articleDesignation: string | null
  designation: string | null
  couleur: string | null
  quantite: number
  quantiteRecue: number
  statut: string
  typeDestination: string
}

export type PartagePublic = {
  label: string | null
  scopeType: string
  scopeLibelle: string
  donneesAu: string
  sections: string[]
  // null = section non partagée ; tableau vide = partagée mais vide.
  stock: PartageStock[] | null
  commandes: PartageCommande[] | null
  importations: PartageImportation[] | null
}
