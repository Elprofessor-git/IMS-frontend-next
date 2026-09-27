// ── Module Courriels (Gmail) ────────────────────────────────────────────────

export type GmailStatus = {
  connected: boolean
  gmailAddress?: string | null
  connectedAt?: string | null
  lastSyncAt?: string | null
  /** Les identifiants OAuth Google sont-ils présents côté serveur. */
  configure: boolean
  /** L'assistance IA (analyse + brouillon de réponse) est-elle disponible. */
  aiAvailable: boolean
  /** Le stockage chiffré des tokens Gmail est-il opérationnel. */
  tokenStorageReady: boolean
  messageCount: number
  unreadCount: number
}

export type GmailMessageListItem = {
  id: number
  gmailMessageId: string
  gmailThreadId: string
  from?: string | null
  subject?: string | null
  snippet?: string | null
  receivedAt: string
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  hasTaskSuggestion: boolean
  createdTaskId?: number | null
}

export type GmailMessageDetail = {
  id: number
  gmailMessageId: string
  gmailThreadId: string
  from?: string | null
  to?: string | null
  cc?: string | null
  subject?: string | null
  bodyText?: string | null
  receivedAt: string
  isRead: boolean
  isStarred: boolean
  createdTaskId?: number | null
}

export type GmailMessagePage = {
  items: GmailMessageListItem[]
  total: number
  page: number
  pageSize: number
}

export type GmailSyncResult = {
  messagesRecus: number
  messagesNouveaux: number
  messagesMisAJour: number
  lastSyncAt?: string | null
}

export type StatutAnalyse = 'Pending' | 'Approved' | 'Rejected'

export type EmailTaskSuggestion = {
  id: number
  gmailMessageId: number
  isTask: boolean
  /** 0 → 1 */
  confidence: number
  suggestedTitle?: string | null
  suggestedDescription?: string | null
  suggestedPriority?: string | null
  suggestedDueDate?: string | null
  suggestedAssigneeUserId?: string | null
  statut: StatutAnalyse
  createdTaskId?: number | null
}

export type CreateTaskFromEmail = {
  titre: string
  description?: string | null
  priorite?: string | null
  dateEcheance?: string | null
  assigneUserId?: string | null
}

export type StatutReponseIa =
  | 'Generated'
  | 'Edited'
  | 'Approved'
  | 'Rejected'
  | 'Sent'

export type EmailAiReply = {
  id: number
  gmailMessageId: number
  subject?: string | null
  body: string
  statut: StatutReponseIa
  generatedAt: string
  sentAt?: string | null
  gmailDraftId?: string | null
}

/** Libellés + couleurs des statuts de brouillon de réponse. */
export const STATUT_REPONSE: Record<StatutReponseIa, string> = {
  Generated: 'Généré',
  Edited: 'Modifié',
  Approved: 'Validé',
  Rejected: 'Refusé',
  Sent: 'Envoyé',
}

export const PRIORITE_SUGGEREE: Record<string, string> = {
  Basse: 'Basse',
  Normale: 'Normale',
  Haute: 'Haute',
}
