'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Calculator, Delete, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { calculer, formater, MAX_DECIMALES, messageErreur } from '@/lib/calculatrice'

/** Touches du pave numerique. `action` declenche un traitement special. */
type Touche =
  | { kind: 'chiffre'; label: string; valeur: string }
  | { kind: 'operateur'; label: string; valeur: '+' | '-' | '*' | '/' }
  | { kind: 'constante'; label: string; valeur: string }
  | {
      kind: 'action'
      label: string
      valeur: 'effacer' | 'retour' | 'parenthese' | 'pourcent' | 'egalite'
    }

const TOUCHES: Touche[][] = [
  [
    { kind: 'action', label: 'AC', valeur: 'effacer' },
    { kind: 'action', label: '( )', valeur: 'parenthese' },
    { kind: 'action', label: '%', valeur: 'pourcent' },
    { kind: 'operateur', label: '÷', valeur: '/' },
  ],
  [
    { kind: 'chiffre', label: '7', valeur: '7' },
    { kind: 'chiffre', label: '8', valeur: '8' },
    { kind: 'chiffre', label: '9', valeur: '9' },
    { kind: 'operateur', label: '×', valeur: '*' },
  ],
  [
    { kind: 'chiffre', label: '4', valeur: '4' },
    { kind: 'chiffre', label: '5', valeur: '5' },
    { kind: 'chiffre', label: '6', valeur: '6' },
    { kind: 'operateur', label: '−', valeur: '-' },
  ],
  [
    { kind: 'chiffre', label: '1', valeur: '1' },
    { kind: 'chiffre', label: '2', valeur: '2' },
    { kind: 'chiffre', label: '3', valeur: '3' },
    { kind: 'operateur', label: '+', valeur: '+' },
  ],
  [
    { kind: 'constante', label: '0', valeur: '0' },
    { kind: 'constante', label: ',', valeur: ',' },
    { kind: 'action', label: '⌫', valeur: 'retour' },
    { kind: 'action', label: '=', valeur: 'egalite' },
  ],
]

/**
 * Calculatrice flottante.
 *
 * Aucun etat partage ni stockage : le composant est monte cote client seulement
 * (import dynamique `ssr: false`) et ne persiste rien. Une expression fausse
 * n'est jamais evaluee en silence — l'erreur reste affichee tant que
 * l'utilisateur ne corrige pas sa saisie.
 */
export function CalculatorWidget() {
  const [expression, setExpression] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const resultat = calculer(expression)
  const erreur = messageErreur(resultat)
  const apercu = expression === '' ? '0' : erreur ? '—' : formater(resultat.ok ? resultat.valeur : 0)
  const saisieRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) setTimeout(() => saisieRef.current?.focus(), 50)
  }, [isOpen])

  // Le clavier physique tape directement dans l'expression, comme un vrai
  // calculateur de bureau : les touches du pave et le clavier partagent l'état.
  const ajouter = useCallback((texte: string) => {
    setExpression((precedent) => precedent + texte)
  }, [])

  const retour = useCallback(() => {
    setExpression((precedent) => precedent.slice(0, -1))
  }, [])

  const parenthese = useCallback(() => {
    setExpression((precedent) => {
      const ouvrantes = (precedent.match(/\(/g) ?? []).length
      const fermantes = (precedent.match(/\)/g) ?? []).length
      // On referme si le dernier caractere est un chiffre ou une parenthese
      // fermee ; sinon on ouvre. Un choix simple, sans etat de curseur.
      const dernier = precedent.at(-1)
      const ouvrir = dernier === undefined || !/[0-9),%]/.test(dernier)
      if (ouvrir) return `${precedent}(`
      if (ouvrantes > fermantes) return `${precedent})`
      return precedent
    })
  }, [])

  const appliquer = useCallback((touche: Touche) => {
    switch (touche.kind) {
      case 'action':
        if (touche.valeur === 'egalite') {
          setExpression((precedent) => {
            const r = calculer(precedent)
            return r.ok ? formater(r.valeur, MAX_DECIMALES).replace(/\s/g, '').replace(',', '.') : precedent
          })
        } else if (touche.valeur === 'effacer') setExpression('')
        else if (touche.valeur === 'retour') setExpression((p) => p.slice(0, -1))
        else if (touche.valeur === 'parenthese') parenthese()
        else if (touche.valeur === 'pourcent') ajouter('%')
        return
      default:
        ajouter(touche.valeur)
    }
  }, [ajouter, parenthese])

  const clavier = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault()
        appliquer({ kind: 'action', label: '=', valeur: 'egalite' })
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        retour()
        return
      }
      if (e.key === 'Escape') {
        setExpression('')
        return
      }
      // Le pave du pave et la virgule francaise.
      if (/^[0-9+\-*/().,%]$/.test(e.key)) {
        e.preventDefault()
        ajouter(e.key)
      }
    },
    [ajouter, appliquer, retour],
  )

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-xs overflow-hidden rounded-xl border bg-card shadow-2xl sm:left-72 sm:right-auto">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Calculatrice</span>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setIsOpen(false)}
              title="Fermer la calculatrice"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Saisie libre : l'expression reste editable au clavier. */}
          <div className="border-b bg-muted/40 px-3 py-2">
            <input
              ref={saisieRef}
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={clavier}
              placeholder="0"
              inputMode="text"
              aria-label="Expression à calculer"
              className="w-full bg-transparent text-right text-sm tabular-nums outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-1 text-right">
              {erreur ? (
                <span className="text-xs font-medium text-destructive">{erreur}</span>
              ) : (
                <span className="text-2xl font-semibold tabular-nums" aria-live="polite">
                  {apercu}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 p-2">
            {TOUCHES.flat().map((touche) => (
              <Button
                key={touche.label}
                variant={touche.kind === 'operateur' ? 'secondary' : 'outline'}
                size="lg"
                className="tabular-nums"
                onClick={() => appliquer(touche)}
              >
                {touche.label === '⌫' ? <Delete className="size-4" /> : touche.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Button
        size="icon"
        className="fixed bottom-4 left-4 z-50 size-12 rounded-full shadow-lg sm:left-72"
        onClick={() => setIsOpen((o) => !o)}
        title={isOpen ? 'Fermer la calculatrice' : 'Ouvrir la calculatrice'}
      >
        <Calculator className="size-5" />
      </Button>
    </>
  )
}
