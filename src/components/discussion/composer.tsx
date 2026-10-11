'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AlertCircle, Hash, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useEnvoyerMessage, useReferencesAutocomplete } from '@/hooks/use-discussion'

/**
 * Zone de rédaction d'une conversation.
 *
 * Règles :
 * - Entrée envoie, Maj+Entrée insère un retour à la ligne ;
 * - le texte N'EST PAS effacé tant que l'envoi n'a pas réussi (une erreur réseau
 *   ne doit jamais faire perdre une rédaction) ;
 * - le message optimiste est ajouté par le hook : il apparaît immédiatement ;
 * - taper « # » ouvre l'AUTOCOMPLÉTION des références métier (E3) : les suggestions
 *   proviennent du serveur et ne concernent que les objets accessibles à l'utilisateur.
 */
export function Composer({
  conversationId,
  auteur,
}: {
  conversationId: number
  auteur: { userId: string; nom: string }
}) {
  const [texte, setTexte] = useState('')
  const [surlignage, setSurlignage] = useState(0)
  const [ferme, setFerme] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const envoyer = useEnvoyerMessage(conversationId)

  // Fragment de référence en cours de saisie : « # », suivi de lettres/chiffres,
  // sans espace. On ne l'active qu'en fin de texte (le dernier jeton tapé).
  const jeton = useMemo(() => {
    const m = /(?:^|\s)#([A-Za-z0-9._-]*)$/.exec(texte)
    if (!m) return null
    return { fragment: m[1], debut: texte.length - m[1].length - 1 }
  }, [texte])

  const requete = useReferencesAutocomplete(
    jeton?.fragment ?? '',
    !ferme && jeton != null && jeton.fragment.length >= 1,
  )
  const suggestions = jeton && !ferme ? (requete.data ?? []) : []

  useEffect(() => {
    setSurlignage(0)
  }, [requete.data, jeton?.fragment])

  const contenuValide = texte.trim().length > 0

  const insererReference = (reference: string) => {
    if (!jeton) return
    const nouveau = `${texte.slice(0, jeton.debut)}#${reference} `
    setTexte(nouveau)
    setFerme(false)
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.setSelectionRange(nouveau.length, nouveau.length)
    })
  }

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
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSurlignage((i) => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSurlignage((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const choix = suggestions[Math.min(surlignage, suggestions.length - 1)]
        if (choix) insererReference(choix.reference)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setFerme(true)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      soumettre()
    }
  }

  return (
    <div className="space-y-2 border-t p-3" data-testid="discussion-composer">
      <div className="relative">
        {suggestions.length > 0 && (
          <ul
            className="absolute bottom-full left-0 z-10 mb-1 max-h-64 w-full max-w-md overflow-y-auto rounded-lg border bg-popover p-1 shadow-md"
            data-testid="discussion-references-suggestions"
          >
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.reference}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                    index === surlignage ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                  )}
                  onMouseEnter={() => setSurlignage(index)}
                  onClick={() => insererReference(suggestion.reference)}
                >
                  <Hash className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{suggestion.reference}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {suggestion.libelle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {requete.isFetching && (
              <li className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Recherche…
              </li>
            )}
          </ul>
        )}

        <Textarea
          ref={ref}
          data-testid="discussion-composer-input"
          value={texte}
          onChange={(e) => {
            setTexte(e.target.value)
            setFerme(false)
          }}
          onKeyDown={surTouche}
          rows={2}
          placeholder="Écrivez un message… (Entrée pour envoyer, Maj+Entrée pour un retour à la ligne, # pour une référence)"
          className="resize-none font-sans text-[15px] leading-relaxed"
          aria-label="Votre message"
        />
      </div>

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
          Texte brut — « # » pour insérer une référence (commande, OF, tâche, achat).
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
