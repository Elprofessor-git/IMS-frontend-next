'use client'

import { useRef, useState } from 'react'
import { Loader2, Paperclip, Send, X, Plus, FileText, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DraftAiToolbar } from '@/components/courriels/draft-ai-toolbar'
import { useComposeEmail, type ComposeAttachment } from '@/hooks/use-gmail'
import { MAX_ATTACHMENT_BYTES, type GmailThreadListItem } from '@/types/gmail'

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

/** Conversion d'un champ multi-fichiers en pièces jointes Base64. */
async function readFiles(files: FileList): Promise<ComposeAttachment[]> {
  const attachments: ComposeAttachment[] = []
  for (const file of Array.from(files)) {
    const buffer = await file.arrayBuffer()
    // Conversion en Base64 par morceaux : String.fromCharCode(...buffer) déborde la pile
    // dès quelques centaines de kilo-octets, ce qui échouerait sur un plan de coupe.
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    attachments.push({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      contentBase64: btoa(binary),
    })
  }
  return attachments
}

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
  const fileInput = useRef<HTMLInputElement>(null)

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([])

  const totalBytes = attachments.reduce((sum, a) => {
    // Le Base64 fait ~4/3 de la taille binaire : on mesure le réel, pas l'estimation.
    const padding = a.contentBase64.endsWith('==') ? 2 : a.contentBase64.endsWith('=') ? 1 : 0
    return sum + Math.floor((a.contentBase64.length * 3) / 4) - padding
  }, 0)

  const overLimit = totalBytes > MAX_ATTACHMENT_BYTES
  const toAddresses = splitAddresses(to)
  const canSend =
    toAddresses.length > 0 &&
    body.trim().length > 0 &&
    !overLimit &&
    !compose.isPending

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const read = await readFiles(files)
    setAttachments((prev) => [...prev, ...read])
    if (fileInput.current) fileInput.current.value = ''
  }

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

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={compose.isPending}
            onClick={() => fileInput.current?.click()}
          >
            <Plus className="size-4" />
            Joindre un fichier
          </Button>
          <span className="text-xs text-muted-foreground">
            {attachments.length > 0
              ? `${attachments.length} pièce(s) · ${humanSize(totalBytes)}`
              : 'Aucune pièce jointe'}
          </span>
        </div>

        {overLimit && (
          <p className="text-xs font-medium text-destructive">
            La limite est de {humanSize(MAX_ATTACHMENT_BYTES)} au total : retirez des pièces
            avant d&apos;envoyer.
          </p>
        )}

        {attachments.length > 0 && (
          <ul className="space-y-1.5">
            {attachments.map((attachment, index) => (
              <li
                key={`${attachment.fileName}-${index}`}
                className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-sm"
              >
                {attachment.mimeType.startsWith('image/') ? (
                  <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate">{attachment.fileName}</span>
                <button
                  type="button"
                  aria-label={`Retirer ${attachment.fileName}`}
                  disabled={compose.isPending}
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
