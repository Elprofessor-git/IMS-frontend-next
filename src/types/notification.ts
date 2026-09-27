// Notification telle que renvoyée par GET /api/Notification/me (projection NotificationController).
//
// `type` est une CHAÎNE envoyée par le backend (et non un ordinal) : la cloche s'y fie
// pour choisir l'icône, et se sert des identifiants ci-dessous pour naviguer. Un type
// inconnu se lit malgré tout (message + date) — l'icône bascule sur l'icône générique.
export type NotificationType =
  | 'Planning'
  | 'TacheAssignee'
  | 'TacheDesassignee'
  | 'TacheDepuisEmail'

export type NotificationItem = {
  id: number
  message: string
  dateNotification: string
  estLivree: boolean
  type: NotificationType
  planningEntryId: number | null
  // Cibles du lien profond, au plus une renseignée, cohérente avec `type`. Ce sont
  // des IDENTIFIANTS, jamais des URL : le backend reste seul juge de l'accès à la
  // ressource (une notification ne contourne aucune permission).
  tacheProductionId: number | null
  gmailMessageId: number | null
}

// Forme RÉELLE de GET /api/Notification/me : { notifications, countNonLivrees }.
export type NotificationPayload = {
  notifications: NotificationItem[]
  countNonLivrees: number
}
