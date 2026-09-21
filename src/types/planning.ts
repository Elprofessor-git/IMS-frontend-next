// Cellule du planning de production : intersection « chaîne de production × samedi ».
// Une cellule contient une commande (NumeroCommande) ; la persistance est assurée
// par le CRUD /api/planning (les clés échangées sont descriptives pour l'humain).
export type PlanningEntry = {
  id: number
  chaineProductionId: number
  dateSamedi: string
  numeroCommande: string
  quantite: number | null
  estLivree: boolean
  notes: string | null
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