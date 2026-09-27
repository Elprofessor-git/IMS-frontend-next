'use client'

import { Paperclip, Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { TaskSuggestionPanel } from '@/components/courriels/task-suggestion-panel'
import { ReplyPanel } from '@/components/courriels/reply-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGmailMessage } from '@/hooks/use-gmail'
import type { GmailMessageListItem } from '@/types/gmail'

export function MessageDetail({
  messageId,
  summary,
  aiAvailable,
}: {
  messageId: number | null
  summary: GmailMessageListItem | undefined
  aiAvailable: boolean
}) {
  const { data: message, isLoading } = useGmailMessage(messageId)

  if (!messageId) {
    return (
      <EmptyState
        title="Sélectionnez un email"
        description="Choisissez un message dans la liste pour afficher son contenu et utiliser l'assistance IA."
      />
    )
  }

  if (isLoading || !message) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="space-y-2 border-b p-4">
        <h2 className="text-lg font-semibold leading-snug">
          {message.subject || '(sans objet)'}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{message.from || 'Expéditeur inconnu'}</span>
          <span>
            {new Date(message.receivedAt).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {summary?.hasAttachments && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3" />
              Pièce jointe
            </span>
          )}
          {summary?.isStarred && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              Suivi
            </span>
          )}
        </div>
        {(message.to || message.cc) && (
          <p className="text-xs text-muted-foreground">
            {message.to && <span>À : {message.to}</span>}
            {message.cc && <span className="ml-3">Cc : {message.cc}</span>}
          </p>
        )}
      </header>

      <Tabs defaultValue="message" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 w-fit">
          <TabsTrigger value="message">Message</TabsTrigger>
          <TabsTrigger value="tache">Tâche</TabsTrigger>
          <TabsTrigger value="reponse">Réponse</TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <TabsContent value="message">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
              {message.bodyText || '(corps du message vide)'}
            </pre>
          </TabsContent>

          <TabsContent value="tache">
            <TaskSuggestionPanel message={message} aiAvailable={aiAvailable} />
          </TabsContent>

          <TabsContent value="reponse">
            <ReplyPanel messageId={message.id} aiAvailable={aiAvailable} />
          </TabsContent>
        </div>
      </Tabs>

      {message.isRead === false && (
        <div className="border-t px-4 py-2">
          <Badge variant="secondary">Non lu</Badge>
        </div>
      )}
    </div>
  )
}
