// Cellule du planning de production : intersection « chaîne de production × date ».
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

// Ligne de date du planning : une « case » verticale (Id 0 = date dérivée d'une
// cellule existante, pas encore créée en base — lecture seule jusqu'à ré-édition).
export type PlanningDate = {
  id: number
  date: string
}

// Forme RÉELLE de GET /api/planning : { chaines, dates, cellules }
// (PlanningController.cs:59) — chaînes = colonnes, dates = lignes.
export type PlanningGrille = {
  chaines: ChainePlanning[]
  dates: PlanningDate[]
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

export type PlanningDatePayload = {
  date: string
}