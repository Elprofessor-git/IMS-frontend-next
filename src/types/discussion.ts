/**
 * Module Discussion (E2) — types alignés sur les DTO du backend
 * (backend/Dtos/Discussion/DiscussionDtos.cs). Le JSON est en camelCase (défauts
 * web d'ASP.NET Core) : les noms de champs ici correspondent exactement à ce que
 * le proxy renvoie, jamais à une version réécrite à la main.
 */

/** Type d'une conversation, transmis EN CHAÎNE par le backend. */
export type TypeConversation = 'Direct' | 'Groupe' | 'Canal'

/** Appartenance d'un utilisateur à une conversation. */
export type MembreDiscussion = {
  userId: string
  nomAffichage: string
  estAdmin: boolean
  muet: boolean
  rejointLe: string
  aQuitteLe: string | null
}

/** Une conversation telle que listée pour l'utilisateur courant. */
export type ConversationDiscussion = {
  id: number
  type: TypeConversation
  nom: string | null
  estPrive: boolean
  /** Je suis administrateur de CETTE conversation (distinct de PeutGererDiscussion). */
  estAdmin: boolean
  creeLe: string
  archiveLe: string | null
  /** Nombre de non-lus pour MOI, calculé en SQL côté serveur. */
  nonLus: number
  dernierMessageLe: string | null
  dernierMessageApercu: string | null
  membres: MembreDiscussion[]
}

/** Un message de discussion : texte BRUT, jamais du HTML. */
export type MessageDiscussion = {
  id: number
  conversationId: number
  auteurUserId: string
  auteurNom: string
  contenu: string
  envoyeLe: string
  modifieLe: string | null
  estSupprime: boolean
  reponseAId: number | null
  /** Curseur de synchronisation, renouvelé par trigger à chaque écriture. */
  revision: number
}

/** Entrée de l'annuaire Discussion (comptes actifs ET internes, sans moi). */
export type UtilisateurDiscussion = {
  userId: string
  nom: string
  prenom: string
  poste: string | null
  nomAffichage: string
}

/** Réponse de GET /api/Discussion/sync : alimente le polling. */
export type SyncDiscussion = {
  curseur: number
  messages: MessageDiscussion[]
  conversations: ConversationDiscussion[]
}

/** Corps de POST /api/Discussion. */
export type CreerConversationPayload = {
  type: TypeConversation
  nom?: string | null
  estPrive?: boolean
  membreIds: string[]
}

/** Corps de POST /api/Discussion/{id}/messages. */
export type EnvoyerMessagePayload = {
  contenu: string
  reponseAId?: number | null
}
