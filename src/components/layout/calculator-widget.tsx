'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Calculator, Delete, GripVertical, X } from 'lucide-react'
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

interface Position {
  x: number
  y: number
}

const DRAG_THRESHOLD = 8

function clampPosition(x: number, y: number, width: number, height: number): Position {
  const maxX = Math.max(0, window.innerWidth - width)
  const maxY = Math.max(0, window.innerHeight - height)
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  }
}

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

  // Positions (session uniquement, pas de stockage localStorage)
  const [buttonPos, setButtonPos] = useState<Position>({ x: 16, y: 16 })
  const [panelPos, setPanelPos] = useState<Position>({ x: 16, y: 16 })

  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{
    target: 'button' | 'panel' | null
    startX: number
    startY: number
    offsetX: number
    offsetY: number
    moved: boolean
  }>({ target: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, moved: false })

  useEffect(() => {
    if (isOpen) setTimeout(() => saisieRef.current?.focus(), 50)
  }, [isOpen])

  // Re-clamp positions on resize/orientation change
  useEffect(() => {
    const handleResize = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const clamped = clampPosition(rect.left, rect.top, rect.width, rect.height)
        if (clamped.x !== rect.left || clamped.y !== rect.top) {
          setButtonPos(clamped)
        }
      }
      if (panelRef.current && isOpen) {
        const rect = panelRef.current.getBoundingClientRect()
        const clamped = clampPosition(rect.left, rect.top, rect.width, rect.height)
        if (clamped.x !== rect.left || clamped.y !== rect.top) {
          setPanelPos(clamped)
        }
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [isOpen])

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
      const dernier = precedent.at(-1)
      const ouvrir = dernier === undefined || !/[0-9),%]/.test(dernier)
      if (ouvrir) return `${precedent}(`
      if (ouvrantes > fermantes) return `${precedent})`
      return precedent
    })
  }, [])

  const appliquer = useCallback(
    (touche: Touche) => {
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
    },
    [ajouter, parenthese],
  )

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
      if (/^[0-9+\-*/().,%]$/.test(e.key)) {
        e.preventDefault()
        ajouter(e.key)
      }
    },
    [ajouter, appliquer, retour],
  )

  const onPointerDown = useCallback((target: 'button' | 'panel', e: React.PointerEvent) => {
    e.preventDefault()
    const el = target === 'button' ? buttonRef.current : panelRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    dragState.current = {
      target,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    }
    el.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragState.current.target === null) return
      e.preventDefault()

      const deltaX = e.clientX - dragState.current.startX
      const deltaY = e.clientY - dragState.current.startY
      if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
        dragState.current.moved = true
      }

      const el = dragState.current.target === 'button' ? buttonRef.current : panelRef.current
      if (!el) return

      const newX = e.clientX - dragState.current.offsetX
      const newY = e.clientY - dragState.current.offsetY
      const clamped = clampPosition(newX, newY, el.offsetWidth, el.offsetHeight)

      if (dragState.current.target === 'button') {
        setButtonPos(clamped)
      } else {
        setPanelPos(clamped)
      }
    },
    [],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent, target: 'button' | 'panel') => {
      const el = target === 'button' ? buttonRef.current : panelRef.current
      if (el && e.pointerId !== undefined) {
        try {
          el.releasePointerCapture(e.pointerId)
        } catch {
          // ignore
        }
      }
      if (target === 'button' && !dragState.current.moved) {
        setIsOpen((o) => !o)
      }
      dragState.current = {
        target: null,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
        moved: false,
      }
    },
    [],
  )

  return (
    <>
      {isOpen && (
        <div
          ref={panelRef}
          data-calculator-panel=""
          className="fixed z-50 w-[calc(100vw-2rem)] max-w-xs overflow-hidden rounded-xl border bg-card shadow-2xl sm:max-w-sm"
          style={{
            left: `${panelPos.x}px`,
            top: `${panelPos.y}px`,
            touchAction: 'none',
          }}
          onPointerDown={(e) => {
            // Le panneau ne se deplace que par sa barre de titre. Le bouton de fermeture
            // vit DANS cette barre : sans cette exclusion, le `setPointerCapture` du
            // panneau rerouterait le `click` vers le panneau et la fermeture ne
            // fonctionnerait plus.
            const cible = e.target as HTMLElement
            if (!cible.closest('[data-drag-handle]') || cible.closest('button')) return
            onPointerDown('panel', e)
          }}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => onPointerUp(e, 'panel')}
        >
          <div
            data-drag-handle
            className="flex items-center justify-between border-b px-3 py-2 cursor-move select-none"
            style={{ touchAction: 'none' }}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Calculatrice</span>
            </div>
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
        ref={buttonRef}
        size="icon"
        className="fixed z-50 size-12 rounded-full shadow-lg"
        style={{
          left: `${buttonPos.x}px`,
          top: `${buttonPos.y}px`,
          touchAction: 'none',
        }}
        onPointerDown={(e) => onPointerDown('button', e)}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerUp(e, 'button')}
        title={isOpen ? 'Fermer la calculatrice' : 'Ouvrir la calculatrice'}
        aria-label={isOpen ? 'Fermer la calculatrice' : 'Ouvrir la calculatrice'}
      >
        <Calculator className="size-5" />
      </Button>
    </>
  )
}