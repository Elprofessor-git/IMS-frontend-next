// Contrat RÉEL GET /api/Matelas (MatelasController.GetAll) — réponse JSON camelCase.
// TABLEAU BRUT, sans paramètre, sans pagination serveur.
export interface MatelasGlobal {
  id: number
  commandeId: number | null
  numeroCommande: string
  numeroMatelas: string
  dateMatelas: string
  piecePliage: number
  coupeEstimee: number
  nombreCoupes: number
  totalPiecesCommandees: number
  notes: string | null
  estActif: boolean
  // Rang dans la séquence de coupe calculée (DateMatelas, NumeroMatelas) croissant.
  // Vue sans table de planning : ordreDeCoupe = 1 → premier matelas à découper.
  ordreDeCoupe: number
}

// GET /api/Matelas/Stats — totaux globaux du module Coupe (toutes commandes).
export interface MatelasStats {
  totalMatelas: number
  totalMatelasActifs: number
  totalPiecesCommandees: number
  totalPiecesCoupees: number
  totalPiecesExportees: number
}

// PUT /api/Matelas/{id} — tous les champs optionnels (mise à jour partielle).
export interface MettreAJourMatelasPayload {
  commandeId?: number | null
  numeroMatelas?: string | null
  dateMatelas?: string | null
  piecePliage?: number | null
  coupeEstimee?: number | null
  notes?: string | null
  estActif?: boolean | null
}