'use client'

import { useState } from 'react'
import { Paperclip, Star, Download, FileText, Image as ImageIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { TaskSuggestionPanel } from '@/components/courriels/task-suggestion-panel'
import { ReplyPanel } from '@/components/courriels/reply-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGmailThread } from '@/hooks/use-gmail'
import { rewriteInlineImageUrls, toApiUrl } from '@/lib/backend-url'
import { cn } from '@/lib/utils'
import type { GmailAttachment, GmailMessageDetail } from '@/types/gmail'

/** Pièces jointes « classiques » : une image intégrée au corps n'en fait pas partie. */
function humanSize(bytes: number): string {
  if (bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function AttachmentList({ attachments }: { attachments: GmailAttachment[] }) {
  const downloadable = attachments.filter((a) => !a.isInline)
  if (downloadable.length === 0) return null

  return (
    <section className="space-y-2 border-t p-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Paperclip className="size-3.5" />
        {downloadable.length} pièce{downloadable.length > 1 ? 's' : ''} jointe
        {downloadable.length > 1 ? 's' : ''}
      </h3>
      <ul className="space-y-1.5">
        {downloadable.map((attachment) => (
          <li key={attachment.gmailAttachmentId}>
            <a
              href={toApiUrl(attachment.url)}
              download={attachment.fileName ?? undefined}
              className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/60"
            >
              {attachment.mimeType?.startsWith('image/') ? (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">
                {attachment.fileName || 'Pièce jointe'}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {humanSize(attachment.sizeBytes)}
              </span>
              <Download className="size-4 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Le contenu est relu depuis Gmail au téléchargement : il n&apos;est jamais stocké par l&apos;IMS.
      </p>
    </section>
  )
}

/**
 * Corps d'un message.
 * <para>
 * Le HTML est rendu via dangerouslySetInnerHTML, ce qui n'est acceptable que parce que le
 * serveur l'assainit (scripts, gestionnaires on*, schémas javascript: et iframes retirés)
 * et réécrit les src="cid:" vers son propre proxy. Le repli texte brut sert d'affichage
 * de secours quand le message n'a pas de partie HTML exploitable.
 * </para>
 * </summary>
 */
function MessageBody({ message }: { message: GmailMessageDetail }) {
  const [showHtml, setShowHtml] = useState(true)

  const hasHtml = !!message.bodyHtml && message.bodyHtml.trim().length > 0

  if (!hasHtml) {
    return (
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
        {message.bodyText || '(corps du message vide)'}
      </pre>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowHtml((v) => !v)}
          className="h-7 text-xs"
        >
          {showHtml ? 'Afficher le texte brut' : 'Afficher la version mise en forme'}
        </Button>
      </div>
      {showHtml ? (
        <div
          className={cn(
            'prose prose-sm max-w-none break-words dark:prose-invert',
            // Contenu de mail : on neutralise les styles externes qui pourraient
            // déborder du panneau (largeurs fixes, marges).
            '[&_table]:max-w-full [&_img]:max-w-full [&_pre]:overflow-x-auto',
          )}
          dangerouslySetInnerHTML={{ __html: rewriteInlineImageUrls(message.bodyHtml!) }}
        />
      ) : (
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
          {message.bodyText || '(corps du message vide)'}
        </pre>
      )}
    </div>
  )
}

function ConversationMessage({ message, aiAvailable }: { message: GmailMessageDetail; aiAvailable: boolean }) {
  const [active, setActive] = useState<'message' | 'tache' | 'reponse'>('message')

  return (
    <article className="rounded-lg border">
      <header className="space-y-1.5 border-b bg-muted/30 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">{message.from || 'Expéditeur inconnu'}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.receivedAt).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {message.to && <span>À : {message.to}</span>}
          {message.cc && <span>Cc : {message.cc}</span>}
          {message.isStarred && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              Suivi
            </span>
          )}
          {message.hasAttachments && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3" />
              Pièce jointe
            </span>
          )}
          {!message.isRead && <Badge variant="secondary">Non lu</Badge>}
        </div>
      </header>

      <div className="p-4">
        <MessageBody message={message} />
      </div>

      <AttachmentList attachments={message.attachments} />

      <div className="border-t px-4 py-2">
        <Tabs value={active} onValueChange={(v) => setActive(v as typeof active)}>
          <TabsList className="w-fit">
            <TabsTrigger value="message">Lecture</TabsTrigger>
            <TabsTrigger value="tache">Tâche</TabsTrigger>
            <TabsTrigger value="reponse">Réponse</TabsTrigger>
          </TabsList>
          <TabsContent value="tache" className="mt-3">
            <TaskSuggestionPanel message={message} aiAvailable={aiAvailable} />
          </TabsContent>
          <TabsContent value="reponse" className="mt-3">
            <ReplyPanel messageId={message.id} aiAvailable={aiAvailable} />
          </TabsContent>
        </Tabs>
      </div>
    </article>
  )
}

export function ThreadDetail({
  gmailThreadId,
  aiAvailable,
}: {
  gmailThreadId: string | null
  aiAvailable: boolean
}) {
  const { data: thread, isLoading } = useGmailThread(gmailThreadId)

  if (!gmailThreadId) {
    return (
      <EmptyState
        title="Sélectionnez une conversation"
        description="Choisissez un fil dans la liste pour afficher tous ses messages et répondre."
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!thread || thread.messages.length === 0) {
    return (
      <EmptyState
        title="Conversation indisponible"
        description="Ce fil ne contient aucun message synchronisé pour votre compte."
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="space-y-1 border-b p-4">
        <h2 className="text-lg font-semibold leading-snug">
          {thread.subject || '(sans objet)'}
        </h2>
        <p className="text-xs text-muted-foreground">
          {thread.messages.length} message{thread.messages.length > 1 ? 's' : ''} · du plus ancien
          au plus récent
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {thread.messages.map((message) => (
          <ConversationMessage
            key={message.id}
            message={message}
            aiAvailable={aiAvailable}
          />
        ))}
      </div>
    </div>
  )
}
