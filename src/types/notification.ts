// Notification telle que renvoyée par GET /api/Notification/me (projection NotificationController).
export type NotificationItem = {
  id: number
  message: string
  dateNotification: string
  estLivree: boolean
  planningEntryId: number | null
}

// Forme RÉELLE de GET /api/Notification/me : { notifications, countNonLivrees }.
export type NotificationPayload = {
  notifications: NotificationItem[]
  countNonLivrees: number
}