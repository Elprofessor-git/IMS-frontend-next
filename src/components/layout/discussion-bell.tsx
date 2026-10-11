'use client'

import Link from 'next/link'
import { MessagesSquare } from 'lucide-react'
import { useCanUtiliserDiscussion } from '@/hooks/use-permissions'
import { useDiscussionNonLus, useDiscussionSync } from '@/hooks/use-discussion'
import { useDiscussionHub } from '@/hooks/use-discussion-hub'

/**
 * Accès rapide à la Discussion depuis la topbar, avec le total des non-lus.
 *
 * C'est ici que tourne le polling GLOBAL du module : le badge se met à jour sur
 * toutes les pages. Quand la page Discussion est ouverte, l'intervalle passe de
 * 25 s à 3 s (voir useDiscussionSync) sans qu'aucune requête ne soit doublée.
 */
export function DiscussionBell() {
  const peutUtiliser = useCanUtiliserDiscussion()
  useDiscussionSync()
  // Temps réel opt-in : sans NEXT_PUBLIC_DISCUSSION_HUB_URL, ce hook ne fait rien et
  // le polling de useDiscussionSync reste le seul transport.
  useDiscussionHub(peutUtiliser)
  const nonLus = useDiscussionNonLus()

  // Sans le drapeau, aucune trace du module dans l'interface.
  if (!peutUtiliser) return null

  return (
    <Link
      href="/discussion"
      data-testid="discussion-bell"
      aria-label={nonLus > 0 ? `Discussion, ${nonLus} non lu(s)` : 'Discussion'}
      title="Discussion"
      className="relative grid size-9 place-items-center rounded-md text-white transition-colors hover:bg-white/15"
    >
      <MessagesSquare className="size-5" />
      {nonLus > 0 && (
        <span
          data-testid="discussion-badge"
          className="absolute top-0.5 right-0.5 grid min-w-4 h-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
        >
          {nonLus > 99 ? '99+' : nonLus}
        </span>
      )}
    </Link>
  )
}
