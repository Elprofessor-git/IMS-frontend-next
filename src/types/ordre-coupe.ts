// Contrat RÉEL de l'API Ordre de coupe (C2) — /api/OrdreCoupe.
// Ce qui se saisit est stocké ; restes, résumé et grandeurs de matières sont recalculés
// côté backend à chaque lecture et n'existent jamais en base.

export interface OrdreCoupeListe {
  id: number
  commandeId: number
  modele: string
  couleur: string
  chaineProductionNom: string | null
  nbTailles: number
  nbPlans: number
  nbMatieres: number
  totalCommande: number
  totalPlanifie: number
  alerteManque: boolean
  verrouille: boolean
  dateCreation: string
}

export interface OrdreCoupeTaille {
  id: number
  index: number
  libelle: string
  quantiteDemandee: number | null
  quantiteAvecMarge: number | null
  notes: string | null
}

export interface OrdreCoupeReste {
  taille: string
  // Négatif = surplus (affiché en rouge).
  valeur: number
}

export interface OrdreCoupeOccurrence {
  taille: string
  occurrences: number
}

export interface OrdreCoupePlan {
  id: number
  index: number
  libelle: string | null
  plis: number
  matelasId: number | null
  matelasNumero: string | null
  verrouille: boolean
  occurrences: OrdreCoupeOccurrence[]
  restes: OrdreCoupeReste[]
}

export interface OrdreCoupeMatiere {
  id: number
  designation: string
  laize: number | null
  consoClient: number
  consoReelle: number | null
  ecartConso: number | null
  retraitPourcentage: number
  metresRecus: number
  notes: string | null
  utilises: number
  retrait: number
  stockRestant: number
  alerte: boolean
}

export interface OrdreCoupe {
  id: number
  commandeId: number
  numeroCommande: string
  modele: string
  couleur: string
  chaineProductionId: number | null
  chaineProductionNom: string | null
  margeSecurite: number
  margePersonnalisee: boolean
  referenceOF: string | null
  notes: string | null
  dateCreation: string
  dateMiseAJour: string | null
  verrouille: boolean
  totalCommande: number
  totalPlanifie: number
  surplus: number
  manque: number
  alerteManque: boolean
  tailles: OrdreCoupeTaille[]
  plans: OrdreCoupePlan[]
  matieres: OrdreCoupeMatiere[]
}

export interface CreerOrdreCoupePayload {
  commandeId: number
  modele: string
  couleur: string
  chaineProductionId?: number | null
  margeSecurite?: number | null
  referenceOF?: string | null
  notes?: string | null
}

export interface ModifierOrdreCoupePayload {
  modele: string
  couleur: string
  chaineProductionId?: number | null
  margeSecurite?: number | null
  referenceOF?: string | null
  notes?: string | null
}

export interface CreerTaillePayload {
  libelle: string
  quantiteDemandee?: number | null
  quantiteAvecMarge?: number | null
  notes?: string | null
}

export type ModifierTaillePayload = CreerTaillePayload

export interface CreerPlanPayload {
  libelle?: string | null
  plis: number
  matelasId?: number | null
  occurrences: OrdreCoupeOccurrence[]
}

export type ModifierPlanPayload = CreerPlanPayload

export interface CreerMatierePayload {
  designation: string
  laize?: number | null
  consoClient: number
  consoReelle?: number | null
  retraitPourcentage: number
  metresRecus: number
  notes?: string | null
}

export type ModifierMatierePayload = CreerMatierePayload
