'use client'

import { Mail, MailOpen, Paperclip, Star, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import type { GmailMessageListItem } from '@/types/gmail'

function formatDate(iso: string): string {
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

export function MessageSkeleton() {
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

export function MessageList({
  messages,
  selectedId,
  onSelect,
  isLoading,
  hasMessages,
}: {
  messages: GmailMessageListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  isLoading: boolean
  hasMessages: boolean
}) {
  if (isLoading) return <MessageSkeleton />

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title={hasMessages ? 'Aucun message' : 'Aucun message synchronisé'}
        description={
          hasMessages
            ? 'Aucun email ne correspond à ce filtre.'
            : 'Lancez une synchronisation pour importer vos messages Gmail.'
        }
      />
    )
  }

  return (
    <ul className="divide-y">
      {messages.map((message) => {
        const isSelected = message.id === selectedId
        return (
          <li key={message.id}>
            <button
              type="button"
              onClick={() => onSelect(message.id)}
              aria-current={isSelected}
              className={cn(
                'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60',
                isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
              )}
            >
              <div className="flex items-center gap-2">
                {message.isRead ? (
                  <MailOpen className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <Mail className="size-3.5 shrink-0 text-primary" />
                )}
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    message.isRead ? 'text-foreground' : 'font-semibold text-foreground',
                  )}
                >
                  {message.from || 'Expéditeur inconnu'}
                </span>
                {message.isStarred && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
              </div>

              <span
                className={cn(
                  'truncate text-sm',
                  message.isRead ? 'text-muted-foreground' : 'font-medium text-foreground',
                )}
              >
                {message.subject || '(sans objet)'}
              </span>

              {message.snippet && (
                <span className="line-clamp-2 text-xs text-muted-foreground">{message.snippet}</span>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] text-muted-foreground">{formatDate(message.receivedAt)}</span>
                {message.hasAttachments && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                    <Paperclip className="size-3" />
                    Pièce jointe
                  </Badge>
                )}
                {message.hasTaskSuggestion && (
                  <Badge variant="outline" className="h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[11px] text-emerald-800">
                    <ListChecks className="size-3" />
                    Tâche
                  </Badge>
                )}
                {message.createdTaskId != null && (
                  <Badge className="h-5 bg-emerald-600 px-1.5 text-[11px] text-white">Tâche créée</Badge>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
