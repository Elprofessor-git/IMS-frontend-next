'use client'

import { Mail, MailOpen, Paperclip, Star, ListChecks, MessagesSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import type { GmailThreadListItem } from '@/types/gmail'

function formatListDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Résumé d'une discussion pour la ligne de liste.
 * Une ligne = un fil. Le nombre de messages et de non-lus permet de juger d'un coup
 * d'œil s'il faut ouvrir la conversation, sans avoir à la faire défiler.
 */
function threadSummary(thread: GmailThreadListItem): string {
  const participants = thread.participants.filter(Boolean)
  if (participants.length === 0) return 'Expéditeur inconnu'
  if (participants.length === 1) return participants[0]
  if (participants.length === 2) return `${participants[0]} et ${participants[1]}`
  return `${participants[0]} et ${participants.length - 1} autres`
}

export function ThreadListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-full" />
        </div>
      ))}
    </div>
  )
}

export function ThreadList({
  threads,
  selectedThreadId,
  onSelect,
  isLoading,
  hasFilter,
}: {
  threads: GmailThreadListItem[]
  selectedThreadId: string | null
  onSelect: (gmailThreadId: string) => void
  isLoading: boolean
  /** Un filtre ou une recherche est-il actif ? Change le message d'état vide. */
  hasFilter?: boolean
}) {
  if (isLoading) return <ThreadListSkeleton />

  if (threads.length === 0) {
    // Sans filtre, une liste vide signifie vraiment « rien de synchronisé » et l'utilisateur
    // doit lancer une synchronisation. AVEC un filtre, elle signifie « rien ne correspond » :
    // annoncer une boîte vide ferait croire à tort que ses emails ont disparu.
    return (
      <EmptyState
        icon={Mail}
        title={hasFilter ? 'Aucune conversation ne correspond' : 'Aucun email synchronisé'}
        description={
          hasFilter
            ? 'Élargissez la recherche ou décochez le filtre non-lus.'
            : 'Lancez une synchronisation pour importer vos messages Gmail.'
        }
      />
    )
  }

  return (
    <ul className="divide-y">
      {threads.map((thread) => {
        const isSelected = thread.gmailThreadId === selectedThreadId
        const isUnread = thread.unreadCount > 0

        return (
          <li key={thread.gmailThreadId}>
            <button
              type="button"
              onClick={() => onSelect(thread.gmailThreadId)}
              aria-current={isSelected}
              className={cn(
                'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60',
                isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
              )}
            >
              <div className="flex items-center gap-2">
                {thread.unreadCount > 0 ? (
                  <Mail className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <MailOpen className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    isUnread ? 'font-semibold text-foreground' : 'text-foreground',
                  )}
                >
                  {threadSummary(thread)}
                </span>
                {thread.isStarred && (
                  <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                )}
              </div>

              <span
                className={cn(
                  'truncate text-sm',
                  isUnread ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {thread.subject || '(sans objet)'}
              </span>

              {thread.snippet && (
                <span className="line-clamp-2 text-xs text-muted-foreground">{thread.snippet}</span>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {formatListDate(thread.lastMessageAt)}
                </span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                  <MessagesSquare className="size-3" />
                  {thread.messageCount} message{thread.messageCount > 1 ? 's' : ''}
                </Badge>
                {thread.unreadCount > 0 && (
                  <Badge className="h-5 bg-primary px-1.5 text-[11px] text-white">
                    {thread.unreadCount} non lu{thread.unreadCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {thread.hasAttachments && (
                  <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
                    <Paperclip className="size-3" />
                  </Badge>
                )}
                {thread.hasTaskSuggestion && (
                  <Badge
                    variant="outline"
                    className="h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[11px] text-emerald-800"
                  >
                    <ListChecks className="size-3" />
                    Tâche
                  </Badge>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
