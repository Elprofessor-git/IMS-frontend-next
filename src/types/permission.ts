export type PermissionEntry = {
  module: string
  canAccess: boolean
  canWrite: boolean
  /**
   * Capacité transversale (ne dépend d'aucun module) répétée sur chaque entrée.
   * Optionnel à la lecture : un backend plus ancien ne l'expose pas.
   */
  peutPartagerLiens?: boolean
  /**
   * Capacité transversale : droit d'assigner une tâche à un autre utilisateur.
   * Conditionne l'accès à l'annuaire des utilisateurs assignables. Optionnel à la
   * lecture pour rester tolérant à un backend plus ancien.
   */
  peutAssignerTaches?: boolean
  /**
   * Module Discussion (E1) : droit d'utiliser la messagerie interne. Également
   * exposé comme module « discussion » (canAccess) ; la capacité transversale est
   * reprise sur chaque entrée pour les hooks dédiés.
   */
  peutUtiliserDiscussion?: boolean
  /**
   * Module Discussion (E1) : modération des canaux PUBLICS uniquement (création,
   * ajout de membres). Ne donne aucun droit sur les groupes ni les messages d'autrui.
   */
  peutGererDiscussion?: boolean
}
