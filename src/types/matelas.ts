// Contrat RÉEL GET /api/Matelas (MatelasController.GetAll) — Select épuré l.30-46.
// TABLEAU BRUT, sans paramètre, sans pagination serveur, sans ChaineProduction* (absent du Select).
export interface MatelasGlobal {
  Id: number
  CommandeId: number
  NumeroCommande: string
  NumeroMatelas: string
  DateMatelas: string
  PiecePliage: number
  CoupeEstimee: number
  NombreCoupes: number
  TotalPiecesCommandees: number
  Notes: string | null
  EstActif: boolean
}
