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
  longueur: number | null
  laize: number | null
  nombreCoupes: number
  totalPiecesCommandees: number
  // Total théorique du plan = Σ (Occurrences × PiecePliage). Remplace le rôle de
  // CoupeEstimee (reste en saisie libre, devient indicateur — constat A.2/A.3).
  totalPlanTheorique: number
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
  longueur?: number | null
  laize?: number | null
  notes?: string | null
  estActif?: boolean | null
}

// ─── Plan de coupe (marker par matelas) — L1 ───
// Contrat RÉEL GET /api/Matelas/{id}/PlanDeCoupe et POST/PUT/DELETE.
export interface PlanDeCoupeLigne {
  id: number
  matelasId: number
  taille: string
  occurrences: number
  notes: string | null
  // Calculé : Occurrences × Matelas.PiecePliage.
  theorique: number
}

export type CreerPlanDeCoupeLignePayload = {
  taille: string
  occurrences: number
  notes?: string | null
}

export type ModifierPlanDeCoupeLignePayload = Partial<CreerPlanDeCoupeLignePayload>

// ─── Ordre de coupe document (vue agrégée) — L2 ───
// Contrat RÉEL GET /api/RapportCoupe/{commandeId}/OrdreDeCoupe.
export interface OrdreCoupePlanLigne {
  // Identifiant de la ligne de plan : permet l'édition/suppression directement
  // depuis l'onglet « Ordre de coupe » (pas de rechargement par matelas).
  ligneId: number
  matelasId: number
  taille: string
  occurrences: number
  theorique: number
  // Coupes réelles déjà rattachées à CE matelas pour CETTE taille.
  coupeReelle: number
  // Reste à couper = theorique − coupeReelle (négatif = au-delà du plan).
  resteACouper: number
}

export interface OrdreCoupeMatelas {
  matelasId: number
  numeroMatelas: string
  dateMatelas: string
  piecePliage: number
  ordreDeCoupe: number
  longueur: number | null
  laize: number | null
  totalTheorique: number
  totalCoupeReelle: number
  // Σ des restes par ligne de plan : reste à couper du matelas entier.
  resteTotal: number
  lignes: OrdreCoupePlanLigne[]
}

export interface OrdreCoupeTaille {
  taille: string
  quantiteCommande: number
  seuil: number
  planTheorique: number
  coupeReelle: number
  depassePlan: boolean
  depasseCoupe: boolean
  coupesSansMatelas: number
}

export interface OrdreDeCoupe {
  commandeId: number
  numeroCommande: string
  margeSecuriteDefaut: number
  totalPlanTheorique: number
  totalCoupeReelle: number
  totalCoupesSansMatelas: number
  matelas: OrdreCoupeMatelas[]
  tailles: OrdreCoupeTaille[]
}

// ─── Journal du jour du module Coupe (toutes commandes) ───
// Contrat RÉEL GET /api/Matelas/CoupesDuJour — lecture seule.
export interface JournalCoupeLigne {
  id: number
  commandeId: number
  numeroCommande: string
  taille: string
  quantiteCoupee: number
  dateCoupe: string
  effectuePar: string | null
  forcerDepassement: boolean
  matelasId: number | null
  matelasNumero: string | null
}

export interface JournalCoupe {
  date: string
  nombreLignes: number
  totalQuantite: number
  lignes: JournalCoupeLigne[]
}