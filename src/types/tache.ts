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

/**
 * Périmètre de lecture des tâches.
 *
 * « mine » ne dépend QUE de l'utilisateur connecté (créateur OU responsable) : c'est
 * le défaut et le seul mode garanti. « all » n'est proposé qu'aux rôles disposant du
 * droit de ressource `PeutVoirToutesTaches` — le serveur refuse sinon (403), le client
 * ne fait donc que refléter une possibilité réelle.
 */
export type TacheScope = 'mine' | 'all'

export type TacheProduction = {
  id: number
  titre: string
  description?: string | null
  commandeClientId?: number | null
  equipeAssignee?: string | null
  /** Libellé legacy conservé pour l'affichage. Source de vérité : `assignedToUserId`. */
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
  groupeTacheId?: number | null

  // ── Ownership (lecture seule) ────────────────────────────────────────────────
  // Ces identifiants sont TOUJOURS décidés par le serveur : le client ne les fournit
  // jamais à la création ni à la mise à jour. Ils sont renvoyés pour l'affichage et
  // la mise en évidence, jamais pour être réinjectés dans une requête d'écriture.
  createdByUserId?: string | null
  assignedToUserId?: string | null
  /** Libellés lisibles, résolus côté serveur à partir des identifiants ci-dessus. */
  createur?: string | null
  responsable?: string | null

  commandeClient?: {
    id: number
    numeroCommande: string
    titreCommande?: string | null
    clientNom?: string | null
  } | null
}

/**
 * Charge utile de création / mise à jour.
 *
 * Volontairement distincte de `TacheProduction` : elle ne contient ni
 * `createdByUserId`, ni `assignedToUserId`, ni les compteurs d'exécution, ni les
 * champs d'audit. C'est le miroir exact des DTOs d'écriture du backend, ce qui
 * empêche le client d'envoyer par inadvertance un champ d'ownership.
 */
export type TacheEcriturePayload = {
  titre: string
  description?: string | null
  commandeClientId?: number | null
  equipeAssignee?: string | null
  /** Libellé d'énumération ('Basse' | 'Normale' | 'Haute' | 'Urgente'). */
  priorite?: string | null
  dateDebutPrevue?: string | null
  dateFinPrevue?: string | null
  dureeEstimeeHeures?: number | null
  notesProgression?: string | null
  /** Création uniquement. Absent ou vide = la tâche vous revient. */
  assignedToUserId?: string | null
}

/** Utilisateur proposé à l'assignation — l'Id n'est jamais saisi à la main. */
export type UtilisateurAssignable = {
  id: string
  displayName: string
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
  /** Le serveur autorise-t-il le mode « Toutes les tâches » pour cet utilisateur ? */
  peutVoirToutesLesTaches: boolean
}

// ── Groupes de tâches (gabarits répétitifs applicables aux commandes) ──

export type GroupeTacheLigne = {
  id: number
  groupeTacheId: number
  titre: string
  description?: string | null
  equipeAssignee?: string | null
  responsableAssigne?: string | null
  priorite: number // 0=Basse 1=Normale 2=Haute 3=Urgente
  ordre: number
  dureeEstimeeHeures: number
}

export type GroupeTache = {
  id: number
  nom: string
  description?: string | null
  estActif: boolean
  dateCreation: string
  lignes: GroupeTacheLigne[]
  nombreCommandesAppliquees: number
  nombreTachesGenerees: number
}
