export const STATUT_TACHE: Record<number, string> = {
  0: 'Non commencée',
  1: 'En cours',
  2: 'Bloquée',
  3: 'Terminée',
  4: 'Annulée',
}

export const PRIORITE_TACHE: Record<number, string> = {
  0: 'Basse',
  1: 'Normale',
  2: 'Haute',
  3: 'Urgente',
}

export type TacheProduction = {
  id: number
  titre: string
  description?: string | null
  commandeClientId?: number | null
  equipeAssignee?: string | null
  responsableAssigne?: string | null
  statut: number   // 0=NonCommence 1=EnCours 2=Bloque 3=Termine 4=Annule
  priorite: number // 0=Basse 1=Normale 2=Haute 3=Urgente
  dateCreation: string
  dateDebutPrevue?: string | null
  dateFinPrevue?: string | null
  dateDebutReelle?: string | null
  dateFinReelle?: string | null
  dureeEstimeeHeures: number
  dureeReelleHeures: number
  pourcentageAvancement: number
  notesProgression?: string | null
  problemesBloques?: string | null
  creePar?: string | null
  dateMiseAJour?: string | null
  modifiePar?: string | null
  commandeClient?: {
    id: number
    numeroCommande: string
    titreCommande?: string | null
    client?: { nom: string } | null
  } | null
}

export type TacheDashboard = {
  totalTaches: number
  nonCommencees: number
  enCours: number
  bloquees: number
  terminees: number
  tachesUrgentes: number
  tachesEnRetard: number
  avancementMoyen: number
}
