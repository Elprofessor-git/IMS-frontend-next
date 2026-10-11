/**
 * Module Discussion (E2) — types alignés sur les DTO du backend
 * (backend/Dtos/Discussion/DiscussionDtos.cs). Le JSON est en camelCase (défauts
 * web d'ASP.NET Core) : les noms de champs ici correspondent exactement à ce que
 * le proxy renvoie, jamais à une version réécrite à la main.
 */

/**
 * Type d'une conversation, transmis EN CHAÎNE par le backend. « Contexte » (E3)
 * désigne une conversation rattachée à un objet métier : son accès suit le module
 * de l'objet, pas l'appartenance, et son nom est le libellé de l'objet.
 */
export type TypeConversation = 'Direct' | 'Groupe' | 'Canal' | 'Contexte'

/** Nature de l'objet auquel une discussion contextuelle (E3) est rattachée. */
export type TypeContexte =
  | 'Commande'
  | 'OrdreFabrication'
  | 'TacheProduction'
  | 'Achat'

/** Segment d'URL du contexte : commande | of | tache | achat. */
export type SegmentContexte = 'commande' | 'of' | 'tache' | 'achat'

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

/**
 * Carte d'une référence métier (#CMD-123, #OF-…, #TAC-…, #ACH-…), calculée CÔTÉ
 * SERVEUR pour le LECTEUR (E3). Un objet hors de ses permissions n'a AUCUNE carte ;
 * `montant`, `devise` et `tiers` restent null sans droit d'écriture sur le module —
 * le backend ne les émet jamais, même masqués.
 */
export type ReferenceDiscussion = {
  type: TypeContexte
  /** Jeton canonique inséré dans le texte, ex. « CMD-123 ». */
  reference: string
  id: number
  libelle: string
  statut: string | null
  date: string | null
  montant: number | null
  devise: string | null
  tiers: string | null
}

/** Entrée d'autocomplétion d'une référence : uniquement des objets accessibles. */
export type ResultatReference = {
  type: TypeContexte
  reference: string
  id: number
  libelle: string
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
  /** Cartes des références du message, calculées pour MOI (E3). */
  references?: ReferenceDiscussion[]
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
