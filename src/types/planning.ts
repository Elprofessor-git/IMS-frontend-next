// Cellule du planning de production : intersection « chaîne de production × samedi ».
// La persistance est assurée par le CRUD /api/planning.
export type PlanningEntry = {
  id: number
  chaineProductionId: number
  dateSamedi: string
  numeroCommande: string
  quantite: number | null
  estLivree: boolean
  notes: string | null
}

// Chaîne de production telle que renvoyée par GET /api/planning (from ChaineProduction).
export type ChainePlanning = {
  id: number
  nom: string
  type: string
}

// Forme RÉELLE de GET /api/planning : { chaines, cellules } (PlanningController.cs:59).
export type PlanningGrille = {
  chaines: ChainePlanning[]
  cellules: PlanningEntry[]
}

export type CreerPlanningEntryPayload = {
  chaineProductionId: number
  dateSamedi: string
  numeroCommande: string
  quantite?: number | null
  estLivree?: boolean
  notes?: string | null
}

export type ModifierPlanningEntryPayload = {
  numeroCommande: string
  quantite: number | null
  estLivree: boolean
  notes: string | null
}