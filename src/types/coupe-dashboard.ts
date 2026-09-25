/** Agrégats de pilotage du module Coupe, par commande (GET /api/Coupe/Dashboard). */
export type CoupeDashboardCommande = {
  commandeId: number
  numeroCommande: string
  titreCommande: string | null
  clientNom: string | null
  plateformeNom: string | null
  statut: string
  dateCommande: string
  nombreMatelas: number
  piecesDemandees: number
  piecesPlanifiees: number
  piecesCoupees: number
  resteAPlanifier: number
  resteACouper: number
  coupesSansMatelas: number
  avancement: number
}

export type CoupeDashboard = {
  date: string
  nombreCommandes: number
  piecesDemandees: number
  piecesPlanifiees: number
  piecesCoupees: number
  resteAPlanifier: number
  resteACouper: number
  commandes: CoupeDashboardCommande[]
}
