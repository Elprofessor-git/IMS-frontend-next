import type { ConversationDiscussion } from '@/types/discussion'

/** Initiales (max 2) pour l'avatar d'une conversation ou d'un message. */
export function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean)
  if (mots.length === 0) return '?'
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase()
  return `${mots[0][0] ?? ''}${mots[1][0] ?? ''}`.toUpperCase()
}

/**
 * Nom affiché d'une conversation.
 *
 * Un DM n'a pas de nom : on montre l'AUTRE participant. Un groupe ou un canal
 * porte son nom ; à défaut (donnée incomplète) on retombe sur le type, jamais
 * sur une chaîne vide qui laisserait une ligne anonyme dans la liste.
 */
export function nomConversation(
  conversation: ConversationDiscussion,
  moiUserId: string,
): string {
  if (conversation.nom && conversation.nom.trim().length > 0) return conversation.nom
  if (conversation.type === 'Direct') {
    const autre = conversation.membres.find((m) => m.userId !== moiUserId)
    return autre?.nomAffichage ?? 'Conversation privée'
  }
  return conversation.type === 'Canal' ? 'Canal sans nom' : 'Groupe sans nom'
}

/** Ligne secondaire de la liste : nature de la conversation et participants. */
export function descriptionConversation(
  conversation: ConversationDiscussion,
  moiUserId: string,
): string {
  const nombre = conversation.membres.length
  if (conversation.type === 'Direct') return 'Message direct'
  const autres = conversation.membres
    .filter((m) => m.userId !== moiUserId)
    .map((m) => m.nomAffichage)
    .filter(Boolean)
  if (autres.length === 0) return `${nombre} membre${nombre > 1 ? 's' : ''}`
  if (autres.length <= 2) return autres.join(', ')
  return `${autres.slice(0, 2).join(', ')} +${autres.length - 2}`
}

/** Horodatage compact de la liste (jour + heure, ou heure seule aujourd'hui). */
export function heureCourte(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const memeJour = date.toDateString() === new Date().toDateString()
  return date.toLocaleString('fr-FR', {
    ...(memeJour ? {} : { day: '2-digit', month: '2-digit' }),
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Horodatage complet d'un message. */
export function heureMessage(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
