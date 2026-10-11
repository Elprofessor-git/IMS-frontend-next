'use client'

import { Loader2, MessagesSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/shared/empty-state'
import { ConversationView } from '@/components/discussion/conversation-view'
import { useAuth } from '@/hooks/use-auth'
import { useCanUtiliserDiscussion } from '@/hooks/use-permissions'
import { useDiscussionContexte } from '@/hooks/use-discussion'
import type { SegmentContexte } from '@/types/discussion'
import type { ApiError } from '@/types'

/**
 * Onglet Discussion d'une fiche métier (E3).
 *
 * La conversation est créée à la demande côté serveur (endpoint idempotent) ; l'accès
 * exige le module de l'objet EN PLUS du drapeau Discussion. Si l'utilisateur n'a pas ce
 * module (403), on l'annonce sobrement — jamais d'erreur brute, jamais de fuite.
 */
export function DiscussionContextuelle({
  segment,
  objetId,
  className,
}: {
  segment: SegmentContexte
  objetId: number | null
  className?: string
}) {
  const { data: user } = useAuth()
  const peutUtiliser = useCanUtiliserDiscussion()
  const requete = useDiscussionContexte(segment, objetId, peutUtiliser)

  const moiUserId = user?.id ?? ''
  const moiNom = user ? `${user.prenom ? user.prenom + ' ' : ''}${user.nom}`.trim() : 'Moi'

  if (!peutUtiliser) {
    return (
      <div className={cn('grid place-items-center rounded-xl border bg-card p-6', className)}>
        <EmptyState
          icon={MessagesSquare}
          title="Discussion indisponible"
          description="Vous n'avez pas accès au module Discussion. Contactez un administrateur."
        />
      </div>
    )
  }

  const erreur = requete.error as ApiError | null

  if (erreur) {
    return (
      <div className={cn('grid place-items-center rounded-xl border bg-card p-6', className)}>
        <EmptyState
          icon={MessagesSquare}
          title="Discussion non accessible"
          description={
            erreur.status === 403
              ? "Vous n'avez pas la permission du module de cet objet : sa discussion vous est réservée."
              : erreur.message
          }
        />
      </div>
    )
  }

  if (requete.isLoading || !requete.data) {
    return (
      <div className={cn('grid place-items-center rounded-xl border bg-card p-6', className)}>
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card', className)}>
      <ConversationView
        conversation={requete.data}
        moiUserId={moiUserId}
        moiNom={moiNom}
      />
    </div>
  )
}
