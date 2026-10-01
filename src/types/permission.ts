export type PermissionEntry = {
  module: string
  canAccess: boolean
  canWrite: boolean
  /**
   * Capacité transversale (ne dépend d'aucun module) répétée sur chaque entrée.
   * Optionnel à la lecture : un backend plus ancien ne l'expose pas.
   */
  peutPartagerLiens?: boolean
}
