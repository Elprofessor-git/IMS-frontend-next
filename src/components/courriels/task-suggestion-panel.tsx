'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Check, X, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAnalyzeMessage,
  useApproveAnalysis,
  useRejectAnalysis,
  useGmailAnalysis,
} from '@/hooks/use-gmail'
import { useCanWrite } from '@/hooks/use-permissions'
import type { EmailTaskSuggestion, GmailMessageDetail } from '@/types/gmail'

const PRIORITES = [
  { value: 'Basse', label: 'Basse' },
  { value: 'Normale', label: 'Normale' },
  { value: 'Haute', label: 'Haute' },
  { value: 'Urgente', label: 'Urgente' },
]

// Formulaire de validation : l'utilisateurcorrige la suggestion IA avant création
// effective de la tâche. Rien n'est créé sans son accord.
function SuggestionForm({
  suggestion,
  messageId,
  canWrite,
}: {
  suggestion: EmailTaskSuggestion
  messageId: number
  canWrite: boolean
}) {
  const approve = useApproveAnalysis(messageId)

  const [titre, setTitre] = useState(suggestion.suggestedTitle ?? '')
  const [description, setDescription] = useState(suggestion.suggestedDescription ?? '')
  const [priorite, setPriorite] = useState(
    PRIORITES.some((p) => p.value === suggestion.suggestedPriority)
      ? (suggestion.suggestedPriority as string)
      : 'Normale',
  )
  const [echeance, setEcheance] = useState(
    suggestion.suggestedDueDate ? suggestion.suggestedDueDate.slice(0, 10) : '',
  )

  useEffect(() => {
    setTitre(suggestion.suggestedTitle ?? '')
    setDescription(suggestion.suggestedDescription ?? '')
    setPriorite(
      PRIORITES.some((p) => p.value === suggestion.suggestedPriority)
        ? (suggestion.suggestedPriority as string)
        : 'Normale',
    )
    setEcheance(suggestion.suggestedDueDate ? suggestion.suggestedDueDate.slice(0, 10) : '')
  }, [suggestion])

  const disabled = approve.isPending || titre.trim().length === 0 || !canWrite

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (disabled) return
        approve.mutate({
          titre: titre.trim(),
          description: description.trim() || null,
          priorite,
          dateEcheance: echeance ? new Date(echeance).toISOString() : null,
          assigneUserId: suggestion.suggestedAssigneeUserId ?? null,
        })
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="suggestion-titre">Titre de la tâche</Label>
        <Input
          id="suggestion-titre"
          value={titre}
          maxLength={100}
          onChange={(e) => setTitre(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="suggestion-description">Description</Label>
        <Textarea
          id="suggestion-description"
          value={description}
          rows={4}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Précisez le contexte de la tâche"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Priorité</Label>
          <Select value={priorite} onValueChange={setPriorite}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="suggestion-echeance">Échéance</Label>
          <Input
            id="suggestion-echeance"
            type="date"
            value={echeance}
            onChange={(e) => setEcheance(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" size="sm" disabled={disabled}>
          {approve.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Créer la tâche
        </Button>
        <p className="self-center text-xs text-muted-foreground">
          La tâche sera créée dans le module « Tâches », avec la provenance de l&apos;email.
        </p>
      </div>
    </form>
  )
}

export function TaskSuggestionPanel({
  message,
  aiAvailable,
}: {
  message: GmailMessageDetail
  aiAvailable: boolean
}) {
  const { data: suggestion, isLoading } = useGmailAnalysis(message.id)
  const analyze = useAnalyzeMessage()
  const reject = useRejectAnalysis(message.id)
  const canWrite = useCanWrite('courriels')

  // Une tâche a déjà été créée depuis cet email : la suggestion n'a plus lieu d'être.
  if (message.createdTaskId != null) {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
          <Check className="size-4" />
          Une tâche a déjà été créée depuis cet email.
        </p>
        <Button variant="outline" size="sm" asChild>
          {/* Lien profond : le module Tâches met en évidence la tâche concernée. */}
          <Link href={`/taches?taskId=${message.createdTaskId}`}>
            Ouvrir la tâche dans le module Tâches
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">Suggestion de tâche</p>
          <p className="text-xs text-muted-foreground">
            L&apos;IA détecte les emails qui demandent une action. Rien n&apos;est créé sans votre
            validation.
          </p>
        </div>
        <Button
          size="sm"
          variant={suggestion ? 'outline' : 'default'}
          onClick={() => analyze.mutate(message.id)}
          disabled={analyze.isPending || !aiAvailable || !canWrite}
          title={aiAvailable ? undefined : "Assistance IA non configurée sur ce serveur"}
        >
          {analyze.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {suggestion ? 'Réanalyser' : 'Analyser cet email'}
        </Button>
      </div>

      {!aiAvailable && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Assistance IA désactivée : la clé <code className="font-mono">GROQ_API_KEY</code> n&apos;est pas
          configurée sur le serveur.
        </p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {suggestion && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            {suggestion.isTask ? (
              <Badge className="bg-emerald-600 text-white">Action détectée</Badge>
            ) : (
              <Badge variant="secondary">Aucune action requise</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Confiance : {Math.round(suggestion.confidence * 100)} %
            </span>
          </div>

          {suggestion.statut === 'Rejected' ? (
            <p className="text-sm text-muted-foreground">Suggestion refusée.</p>
          ) : suggestion.isTask ? (
            <SuggestionForm suggestion={suggestion} messageId={message.id} canWrite={canWrite} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Cet email est informatif : aucun suivi n&apos;est nécessaire.
            </p>
          )}

          {suggestion.statut === 'Pending' && suggestion.isTask && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => reject.mutate()}
              disabled={reject.isPending || !canWrite}
            >
              <X className="size-4" />
              Ce n&apos;est pas une tâche
            </Button>
          )}
        </div>
      )}

      {!suggestion && !isLoading && (
        <p className="text-sm text-muted-foreground">
          Aucune analyse pour ce message. Lancez l&apos;analyse pour détecter une action à suivre.
        </p>
      )}
    </div>
  )
}
