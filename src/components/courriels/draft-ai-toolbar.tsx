'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Languages, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEditDraft } from '@/hooks/use-gmail'
import { useCanWrite } from '@/hooks/use-permissions'
import { toast } from 'sonner'
import { TRANSLATE_LANGUAGES } from '@/types/gmail'

/**
 * Barre d'édition IA d'un brouillon : reformuler et traduire.
 *
 * Contrainte de conception : le modèle ne reçoit QUE le texte du champ de composition.
 * Aucun email, aucun fil, aucune donnée IMS ne lui sont transmis, et le résultat
 * remplace le champ — il n'est jamais persisté par cet écran.
 *
 * Les langues sont une liste fermée (FR/EN/AR) : le serveur la refuse aussi de son
 * côté, ce double contrôle évite qu'un client obtienne une traduction vers une langue
 * non prevue.
 */
export function DraftAiToolbar({
  text,
  onReplace,
  disabled,
}: {
  text: string
  onReplace: (next: string) => void
  disabled?: boolean
}) {
  const canWrite = useCanWrite('courriels')
  const editDraft = useEditDraft()
  const [instruction, setInstruction] = useState('')
  const [before, setBefore] = useState<string | null>(null)

  const busy = editDraft.isPending
  const hasText = text.trim().length > 0
  const blocked = disabled || !canWrite || busy || !hasText

  const run = (action: 'Rewrite' | 'Translate', targetLanguage?: string) => {
    setBefore(text)
    editDraft.mutate(
      {
        text,
        action,
        instruction: action === 'Rewrite' ? instruction.trim() || null : null,
        targetLanguage: targetLanguage ?? null,
      },
      {
        onSuccess: (result) => {
          onReplace(result.text)
          toast.success(
            action === 'Translate'
              ? `Texte traduit en ${result.targetLanguage ?? ''}`
              : 'Texte reformulé',
          )
        },
        // L'erreur est déjà signalée par le hook (toast).
      },
    )
  }

  if (!canWrite) return null

  return (
    <div className="space-y-2 rounded-md border border-dashed bg-muted/20 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Aide à la rédaction</span>

        <div className="flex items-center gap-1.5">
          <Input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={blocked}
            placeholder="Ex. : rendre plus formel et plus bref"
            aria-label="Consigne de reformulation"
            className="h-8 w-56 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            disabled={blocked}
            onClick={() => run('Rewrite')}
            title="Réécrire le texte en appliquant la consigne (facultative)"
          >
            {editDraft.isPending && editDraft.variables?.action === 'Rewrite' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Reformuler
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Languages className="size-3.5" />
          Traduire en
        </span>
        {TRANSLATE_LANGUAGES.map((lang) => (
          <Button
            key={lang.code}
            type="button"
            size="sm"
            variant="secondary"
            className="h-8"
            disabled={blocked}
            onClick={() => run('Translate', lang.code)}
          >
            {editDraft.isPending && editDraft.variables?.targetLanguage === lang.code ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {lang.label}
          </Button>
        ))}

        {before !== null && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground"
            disabled={busy}
            onClick={() => {
              onReplace(before)
              setBefore(null)
            }}
          >
            <Undo2 className="size-3.5" />
            Revenir au texte d&apos;avant
          </Button>
        )}
      </div>

      {!hasText && (
        <p className="text-[11px] text-muted-foreground">
          Saisissez un texte dans le message pour utiliser l&apos;assistance.
        </p>
      )}
    </div>
  )
}
