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
  /** HTML déjà assaini côté serveur (scripts, on*, javascript:, iframes retirés).
   *  Les images intégrées pointent vers le proxy IMS : afficher via dangerouslySetInnerHTML. */
  bodyHtml?: string | null
  receivedAt: string
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  attachments: GmailAttachment[]
  createdTaskId?: number | null
}

/** Métadonnées d'une pièce jointe (jamais le binaire : proxy Gmail à la demande). */
export type GmailAttachment = {
  gmailAttachmentId: string
  fileName?: string | null
  mimeType?: string | null
  sizeBytes: number
  isInline: boolean
  url: string
}

export type GmailThreadListItem = {
  gmailThreadId: string
  subject?: string | null
  snippet?: string | null
  /** Message de référence de la ligne (le plus récent du fil), clé IMS. */
  lastMessageId: number
  /**
   * Identifiant Gmail du message le plus récent (et non sa clé IMS) : c'est lui que
   * l'API Gmail attend comme parent d'une réponse. `lastMessageId` sert aux écrans
   * IMS (tâche, réponse IA) ; `lastGmailMessageId` sert à l'envoi d'un email.
   */
  lastGmailMessageId: string
  lastMessageAt: string
  messageCount: number
  unreadCount: number
  isStarred: boolean
  hasAttachments: boolean
  hasTaskSuggestion: boolean
  participants: string[]
}

export type GmailThreadPage = {
  items: GmailThreadListItem[]
  total: number
  page: number
  pageSize: number
}

export type GmailThreadDetail = {
  gmailThreadId: string
  subject?: string | null
  /** Messages du plus ancien au plus récent. */
  messages: GmailMessageDetail[]
}

/** Langues de traduction autorisées par l'endpoint d'édition IA (liste fermée). */
export const TRANSLATE_LANGUAGES = [
  { code: 'FR', label: 'Français' },
  { code: 'EN', label: 'English' },
  { code: 'AR', label: 'العربية' },
] as const

/** Plafond de pièces jointes, aligné sur la limite serveur (20 Mo cumulés). */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

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
