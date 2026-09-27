'use client'

import { useEffect, useState } from 'react'
import { Loader2, Mail, Send, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateGmailDraft,
  useGenerateReply,
  useGmailReplies,
  useRejectReply,
  useSendReply,
  useUpdateReply,
} from '@/hooks/use-gmail'
import { useCanWrite } from '@/hooks/use-permissions'
import { STATUT_REPONSE, type EmailAiReply, type StatutReponseIa } from '@/types/gmail'

const STATUT_BADGE: Record<StatutReponseIa, string> = {
  Generated: 'border-sky-200 bg-sky-50 text-sky-800',
  Edited: 'border-amber-200 bg-amber-50 text-amber-800',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Rejected: 'border-slate-200 bg-slate-100 text-slate-600',
  Sent: 'border-emerald-300 bg-emerald-100 text-emerald-900',
}

// Éditeur d'un brouillon : relire, corriger, puis figer dans Gmail et envoyer.
function ReplyEditor({ reply, messageId }: { reply: EmailAiReply; messageId: number }) {
  const updateReply = useUpdateReply(messageId)
  const createDraft = useCreateGmailDraft(messageId)
  const send = useSendReply(messageId)
  const reject = useRejectReply(messageId)
  const canWrite = useCanWrite('courriels')

  const [body, setBody] = useState(reply.body)
  const [subject, setSubject] = useState(reply.subject ?? '')

  useEffect(() => {
    setBody(reply.body)
    setSubject(reply.subject ?? '')
  }, [reply.id, reply.body, reply.subject])

  const isSent = reply.statut === 'Sent' || !canWrite
  const busy = updateReply.isPending || createDraft.isPending || send.isPending || reject.isPending
  const dirty = body !== reply.body || subject !== (reply.subject ?? '')

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={STATUT_BADGE[reply.statut]}>
          {STATUT_REPONSE[reply.statut]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(reply.generatedAt).toLocaleString('fr-FR')}
        </span>
        {reply.sentAt && (
          <span className="text-xs text-emerald-700">
            Envoyé le {new Date(reply.sentAt).toLocaleString('fr-FR')}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`reply-subject-${reply.id}`}>Objet</Label>
        <Input
          id={`reply-subject-${reply.id}`}
          value={subject}
          disabled={isSent}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`reply-body-${reply.id}`}>Message</Label>
        <Textarea
          id={`reply-body-${reply.id}`}
          value={body}
          rows={12}
          disabled={isSent}
          onChange={(e) => setBody(e.target.value)}
          className="font-mono text-[13px]"
        />
      </div>

      {isSent ? (
        <p className="text-xs text-muted-foreground">
          {canWrite
            ? 'Réponse envoyée — la modification n\'est plus possible.'
            : 'Droits insuffisants : ce brouillon est en lecture seule.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!dirty || busy}
            onClick={() => updateReply.mutate({ id: reply.id, body, subject })}
          >
            {updateReply.isPending && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => createDraft.mutate(reply.id)}
            title="Crée le brouillon dans Gmail sans l'envoyer"
          >
            {createDraft.isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            Créer le brouillon Gmail
          </Button>
          <Button size="sm" disabled={busy} onClick={() => send.mutate(reply.id)}>
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Envoyer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => reject.mutate(reply.id)}
            className="text-muted-foreground"
          >
            <Trash2 className="size-4" />
            Refuser
          </Button>
        </div>
      )}
    </div>
  )
}

export function ReplyPanel({
  messageId,
  aiAvailable,
}: {
  messageId: number
  aiAvailable: boolean
}) {
  const { data: replies, isLoading } = useGmailReplies(messageId)
  const generate = useGenerateReply(messageId)
  const canWrite = useCanWrite('courriels')
  const [instruction, setInstruction] = useState('')

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Réponse assistée</p>
        <p className="text-xs text-muted-foreground">
          L&apos;IA rédige une proposition de réponse. Rien n&apos;est envoyé sans votre relecture et
          votre validation explicite.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <div className="space-y-1.5">
          <Label htmlFor="reply-instruction">Consigne (facultatif)</Label>
          <Input
            id="reply-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ex. : confirmer que le tissu arrive vendredi"
            disabled={!aiAvailable || !canWrite}
          />
        </div>
        <Button
          size="sm"
          disabled={!aiAvailable || !canWrite || generate.isPending}
          onClick={() => generate.mutate(instruction || undefined)}
        >
          {generate.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Rédiger une réponse
        </Button>
        {!aiAvailable && (
          <p className="text-xs text-amber-700">
            Assistance IA désactivée sur ce serveur (GROQ_API_KEY absente).
          </p>
        )}
        {!canWrite && (
          <p className="text-xs text-amber-700">
            Votre rôle ne permet pas de gérer les courriels : consultation seule.
          </p>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {replies && replies.length > 0 && (
        <div className="space-y-3">
          {replies.map((reply) => (
            <ReplyEditor key={reply.id} reply={reply} messageId={messageId} />
          ))}
        </div>
      )}

      {!isLoading && replies && replies.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune réponse générée pour cet email.</p>
      )}
    </div>
  )
}
