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
   *  Les images intégrées pointent vers le proxy du système : afficher via dangerouslySetInnerHTML. */
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
  /** Message de référence de la ligne (le plus récent du fil), clé interne. */
  lastMessageId: number
  /**
   * Identifiant Gmail du message le plus récent (et non sa clé interne) : c'est lui que
   * l'API Gmail attend comme parent d'une réponse. `lastMessageId` sert aux écrans
   * système (tâche, réponse IA) ; `lastGmailMessageId` sert à l'envoi d'un email.
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

/**
 * Modes de composition. Les quatre passent par le MÊME composant et la MÊME barre
 * d'outils : aucun mode ne possède d'action qui lui soit propre.
 * <para>
 * Les valeurs sont les noms exacts attendus par le serveur, qui les refuse s'il ne
 * reconnaît pas le mode — une faute de frappe ne doit pas transformer une réponse en
 * message détaché du fil.
 * </para>
 */
export type ComposeMode = 'New' | 'Reply' | 'ReplyAll' | 'Forward'

export const COMPOSE_MODES: readonly ComposeMode[] = ['New', 'Reply', 'ReplyAll', 'Forward']

/** Libellés d'interface, dans l'ordre d'affichage. */
export const COMPOSE_MODE_LABELS: Record<ComposeMode, string> = {
  New: 'Nouveau message',
  Reply: 'Répondre',
  ReplyAll: 'Répondre à tous',
  Forward: 'Transférer',
}

/**
 * Préremplissage calculé par le serveur.
 * <para>
 * `bodyText` est la zone de rédaction, VIDE : la citation est renvoyée à part dans
 * `quotedText` et n'entre jamais dans le champ modifiable. Sinon « Reformuler » ou
 * « Traduire » réécriraient l'adversaire au lieu du message.
 * </para>
 */
export type ComposePrefill = {
  mode: ComposeMode
  replyToMessageId: number
  to: string[]
  cc: string[]
  subject: string
  bodyText: string
  quotedText: string
  aiReplyId?: number | null
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

/**
 * Compte-rendu d'un passage de maintenance des pièces jointes.
 *
 * `restants` n'est renvoyé que par le rattrapage : nombre de messages candidats non
 * couverts par le budget. Tant qu'il est positif, un second passage reprend exactement
 * où le premier s'est arrêté.
 */
export type AttachmentMaintenanceReport = {
  /** Messages réellement relus auprès de Gmail pendant le passage. */
  examines: number
  /** Lignes de pièces créées — absent du rapport de requalification. */
  creees?: number
  /**
   * Qualification corrigée sur des lignes EXISTANTES — absent du rattrapage, qui ne
   * traite que des messages sans aucune pièce : la qualification y est appliquée à la
   * création, il n'y a donc rien à reclasser.
   */
  reclasses?: number
  erreurs: number
  restants?: number
  /** Détail par message : ce qu'un lancement supervisé doit pouvoir relire. */
  messages: string[]
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
  /** Objet réellement parti, renseigné seulement après un envoi réussi. */
  sentSubject?: string | null
  /**
   * Texte réellement parti. DistINCT de `body` : entre la génération et l'envoi, le
   * texte a été relu, corrigé, reformulé ou traduit. C'est cette version qu'il faut
   * garder pour vérifier ce qui est réellement arrivé au destinataire.
   */
  sentBody?: string | null
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
