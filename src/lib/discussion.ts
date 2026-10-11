import type { ConversationDiscussion, ReferenceDiscussion } from '@/types/discussion'

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
  if (conversation.type === 'Contexte') return 'Discussion rattachée'
  return conversation.type === 'Canal' ? 'Canal sans nom' : 'Groupe sans nom'
}

/**
 * Route de la fiche d'un objet référencé (#CMD-…). Null quand l'objet n'a pas de
 * fiche dédiée (un OF se consulte depuis sa commande) : la carte reste alors
 * purement informative, jamais un lien mort.
 */
export function lienReference(reference: ReferenceDiscussion): string | null {
  switch (reference.type) {
    case 'Commande':
      return `/commandes/${reference.id}`
    case 'Achat':
      return `/achats/${reference.id}`
    case 'TacheProduction':
      return `/taches?taskId=${reference.id}`
    default:
      return null
  }
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

/** Date courte (jour/mois/année) d'un objet référencé, ou chaîne vide. */
export function dateObjet(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Montant + devise d'une carte de référence, ou null si le lecteur n'y a pas droit. */
export function montantReference(
  reference: ReferenceDiscussion,
): string | null {
  if (reference.montant == null) return null
  const valeur = reference.montant.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return reference.devise ? `${valeur} ${reference.devise}` : valeur
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
