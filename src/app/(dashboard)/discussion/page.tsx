'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { EmptyState } from '@/components/shared/empty-state'
import { PermissionGate } from '@/components/auth/permission-gate'
import { Button } from '@/components/ui/button'
import { ConversationList } from '@/components/discussion/conversation-list'
import { ConversationView } from '@/components/discussion/conversation-view'
import { NouvelleConversation } from '@/components/discussion/nouvelle-conversation'
import { useAuth } from '@/hooks/use-auth'
import { useCanGererDiscussion } from '@/hooks/use-permissions'
import {
  setDiscussionPageOuverte,
  useDiscussionConversations,
  useDiscussionSync,
} from '@/hooks/use-discussion'
import { cn } from '@/lib/utils'

/**
 * Page Discussion (E2).
 *
 * Le transport est UNIQUE : le hook useDiscussionSync interroge GET /sync avec un
 * curseur, à intervalle adaptatif (3 s page ouverte et onglet visible, 25 s sinon,
 * suspendu si l'onglet est caché). Le badge de la topbar consomme le même cache.
 */
function DiscussionContent() {
  const { data: user } = useAuth()
  const moiUserId = user?.id ?? ''
  const moiNom = user ? `${user.prenom ? user.prenom + ' ' : ''}${user.nom}`.trim() : 'Moi'

  // Déclare la page ouverte : fait passer le polling à 3 s tant qu'on est dessus.
  useEffect(() => {
    setDiscussionPageOuverte(true)
    return () => setDiscussionPageOuverte(false)
  }, [])

  useDiscussionSync()
  const conversations = useDiscussionConversations()
  const peutGerer = useCanGererDiscussion()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  // Vue mobile : liste seule, ou conversation seule. Sur grand écran les deux
  // panneaux cohabitent (voir la grille), cet état n'agit donc qu'en petit écran.
  const [detailMobile, setDetailMobile] = useState(false)
  const [creationOuverte, setCreationOuverte] = useState(false)

  // La conversation sélectionnée peut disparaître (départ, suppression côté sync) :
  // on désélectionne pour ne pas laisser un panneau orphelin.
  useEffect(() => {
    if (selectedId == null) return
    if (!conversations.some((c) => c.id === selectedId)) {
      setSelectedId(null)
      setDetailMobile(false)
    }
  }, [conversations, selectedId])

  const selectionnee = conversations.find((c) => c.id === selectedId) ?? null
  const chargement = conversations.length === 0 && selectedId == null

  const ouvrirConversation = (id: number) => {
    setSelectedId(id)
    setDetailMobile(true)
  }

  return (
    <PermissionGate
      module="discussion"
      mode="read"
      fallback={<ForbiddenState moduleLabel="Discussion" />}
    >
      <PageHeader
        title="Discussion"
        description="Messagerie interne : messages directs, groupes et canaux. Le texte brut n'interprète aucun HTML."
        action={
          <Button onClick={() => setCreationOuverte(true)} data-testid="discussion-nouveau">
            <Plus className="size-4" />
            Nouvelle conversation
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <section
          className={cn(
            'h-[70vh] min-h-[28rem] overflow-hidden rounded-xl border bg-card',
            detailMobile && 'hidden lg:block',
          )}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={ouvrirConversation}
            moiUserId={moiUserId}
            isLoading={chargement}
          />
        </section>

        <section
          className={cn(
            'h-[70vh] min-h-[28rem] overflow-hidden rounded-xl border bg-card',
            !detailMobile && 'hidden lg:block',
          )}
        >
          {selectionnee ? (
            <ConversationView
              conversation={selectionnee}
              moiUserId={moiUserId}
              moiNom={moiNom}
              onRetour={() => setDetailMobile(false)}
            />
          ) : (
            <EmptyState
              title="Sélectionnez une conversation"
              description="Choisissez une conversation dans la liste pour afficher les messages."
            />
          )}
        </section>
      </div>

      <NouvelleConversation
        open={creationOuverte}
        onOpenChange={setCreationOuverte}
        peutGerer={peutGerer}
        onCreated={(conversation) => ouvrirConversation(conversation.id)}
      />
    </PermissionGate>
  )
}

export default function DiscussionPage() {
  return <DiscussionContent />
}
