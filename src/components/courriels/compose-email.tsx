'use client'

import { useState } from 'react'
import { Loader2, Paperclip, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DraftAiToolbar } from '@/components/courriels/draft-ai-toolbar'
import { AttachmentPicker, attachmentsSize } from '@/components/courriels/attachment-picker'
import { useComposeEmail, type ComposeAttachment } from '@/hooks/use-gmail'
import { MAX_ATTACHMENT_BYTES, type GmailThreadListItem } from '@/types/gmail'

/** Découpe une saisie « a@x.fr, b@y.fr » en adresses. */
function splitAddresses(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0)
}

/**
 * Composition d'un nouvel email, hors du cycle « réponse IA ».
 * Sert aussi à répondre dans un fil : le message de référence est transmis, le backend
 * résout le fil et les en-têtes de réponse côté serveur (jamais acceptés depuis le client).
 */
export function ComposeEmail({
  replyTo,
  onSent,
}: {
  /** Fil auquel rattacher l'envoi, si la composition part d'une conversation. */
  replyTo?: GmailThreadListItem | null
  onSent?: () => void
}) {
  const compose = useComposeEmail()

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([])

  const totalBytes = attachmentsSize(attachments)

  const overLimit = totalBytes > MAX_ATTACHMENT_BYTES
  const toAddresses = splitAddresses(to)
  const canSend =
    toAddresses.length > 0 &&
    body.trim().length > 0 &&
    !overLimit &&
    !compose.isPending

  const submit = () => {
    if (!canSend) return
    compose.mutate(
      {
        to: toAddresses,
        subject: subject.trim() || '(sans objet)',
        bodyText: body,
        attachments: attachments.length > 0 ? attachments : null,
        inReplyTo: replyTo?.lastGmailMessageId ?? null,
      },
      {
        onSuccess: () => {
          setTo('')
          setSubject('')
          setBody('')
          setAttachments([])
          onSent?.()
        },
      },
    )
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="compose-to">Destinataires</Label>
        <Input
          id="compose-to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="client@exemple.fr, autre@exemple.fr"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="compose-subject">Objet</Label>
        <Input
          id="compose-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Objet du message"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="compose-body">Message</Label>
        <Textarea
          id="compose-body"
          value={body}
          rows={10}
          onChange={(e) => setBody(e.target.value)}
          className="text-sm"
        />
      </div>

      <DraftAiToolbar text={body} onReplace={setBody} disabled={compose.isPending} />

      <AttachmentPicker
        attachments={attachments}
        onChange={setAttachments}
        disabled={compose.isPending}
      />

      <div className="flex items-center justify-between gap-2">
        {replyTo ? (
          <Badge variant="outline" className="max-w-full truncate">
            <Paperclip className="mr-1 size-3" />
            en réponse à {replyTo.subject || '(sans objet)'}
          </Badge>
        ) : (
          <span />
        )}
        <Button size="sm" disabled={!canSend} onClick={submit}>
          {compose.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Envoyer
        </Button>
      </div>
    </div>
  )
}
