'use client'

import { useState, type KeyboardEvent } from 'react'
import { AlertCircle, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useEnvoyerMessage } from '@/hooks/use-discussion'

/**
 * Zone de rédaction d'une conversation.
 *
 * Règles :
 * - Entrée envoie, Maj+Entrée insère un retour à la ligne ;
 * - le texte N'EST PAS effacé tant que l'envoi n'a pas réussi (une erreur réseau
 *   ne doit jamais faire perdre une rédaction) ;
 * - le message optimiste est ajouté par le hook : il apparaît immédiatement.
 */
export function Composer({
  conversationId,
  auteur,
}: {
  conversationId: number
  auteur: { userId: string; nom: string }
}) {
  const [texte, setTexte] = useState('')
  const envoyer = useEnvoyerMessage(conversationId)

  const contenuValide = texte.trim().length > 0

  const soumettre = () => {
    if (!contenuValide) return
    envoyer.mutate(
      { contenu: texte.trim(), auteur },
      {
        // Succès : on efface. Échec : on garde le texte et le hook signale l'erreur.
        onSuccess: () => setTexte(''),
      },
    )
  }

  const surTouche = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      soumettre()
    }
  }

  return (
    <div className="space-y-2 border-t p-3" data-testid="discussion-composer">
      <Textarea
        data-testid="discussion-composer-input"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onKeyDown={surTouche}
        rows={2}
        placeholder="Écrivez un message… (Entrée pour envoyer, Maj+Entrée pour un retour à la ligne)"
        className="resize-none font-sans text-[15px] leading-relaxed"
        aria-label="Votre message"
      />

      {envoyer.isError && (
        <p
          data-testid="discussion-composer-erreur"
          className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-900"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {envoyer.error?.message ?? "Le message n'a pas pu être envoyé. Votre texte est conservé."}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          Texte brut — les liens sont détectés, aucun HTML n&apos;est interprété.
        </span>
        <Button
          size="sm"
          disabled={!contenuValide}
          onClick={soumettre}
          data-testid="discussion-composer-envoyer"
        >
          {envoyer.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Envoyer
        </Button>
      </div>
    </div>
  )
}
