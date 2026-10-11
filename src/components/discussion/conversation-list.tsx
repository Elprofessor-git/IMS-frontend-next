'use client'

import { useMemo, useState } from 'react'
import { Hash, MessagesSquare, Search, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import {
  descriptionConversation,
  heureCourte,
  initiales,
  nomConversation,
} from '@/lib/discussion'
import type { ConversationDiscussion } from '@/types/discussion'

function IconeType({ type }: { type: ConversationDiscussion['type'] }) {
  if (type === 'Canal') return <Hash className="size-3.5" />
  if (type === 'Groupe') return <Users className="size-3.5" />
  return <MessagesSquare className="size-3.5" />
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * Liste des conversations de l'utilisateur. Le filtre de recherche est purement
 * local : la liste complète tient en mémoire (snapshot /sync), filtrer ne doit pas
 * déclencher d'appel réseau.
 */
export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  moiUserId,
  isLoading,
}: {
  conversations: ConversationDiscussion[]
  selectedId: number | null
  onSelect: (id: number) => void
  moiUserId: string
  isLoading: boolean
}) {
  const [filtre, setFiltre] = useState('')

  const visibles = useMemo(() => {
    const q = filtre.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => {
      const nom = nomConversation(c, moiUserId).toLowerCase()
      return nom.includes(q) || (c.dernierMessageApercu ?? '').toLowerCase().includes(q)
    })
  }, [conversations, filtre, moiUserId])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b p-4">
        <div className="space-y-1">
          <Label htmlFor="discussion-recherche" className="sr-only">
            Rechercher une conversation
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="discussion-recherche"
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
              placeholder="Rechercher une conversation…"
              className="pl-9"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
          {filtre ? ` · filtre « ${filtre} »` : ''}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <ConversationListSkeleton />
        ) : visibles.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title={conversations.length === 0 ? 'Aucune conversation' : 'Aucun résultat'}
            description={
              conversations.length === 0
                ? 'Créez un message direct, un groupe ou un canal pour commencer.'
                : 'Aucune conversation ne correspond à votre recherche.'
            }
          />
        ) : (
          <ul className="divide-y">
            {visibles.map((conversation) => {
              const isSelected = conversation.id === selectedId
              const nom = nomConversation(conversation, moiUserId)
              const nonLus = conversation.nonLus
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    aria-current={isSelected}
                    data-testid={`conversation-${conversation.id}`}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60',
                      isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold',
                        nonLus > 0
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground',
                      )}
                      aria-hidden="true"
                    >
                      {initiales(nom)}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {nom}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {heureCourte(conversation.dernierMessageLe)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <IconeType type={conversation.type} />
                        <span className="min-w-0 flex-1 truncate">
                          {conversation.dernierMessageApercu ??
                            descriptionConversation(conversation, moiUserId)}
                        </span>
                        {nonLus > 0 && (
                          <span
                            data-testid={`non-lus-${conversation.id}`}
                            className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-white"
                          >
                            {nonLus > 99 ? '99+' : nonLus}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
