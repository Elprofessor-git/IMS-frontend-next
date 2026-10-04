'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Article } from '@/types/article'

interface ArticlesMultiSelectProps {
  value: number[]
  onChange: (ids: number[]) => void
  articles: Article[]
  placeholder?: string
  disabled?: boolean
  /** Rend le compteur de sélection quand une limite est imposée. */
  maxSelections?: number
}

/**
 * Sélection multiple d'articles.
 *
 * Le composant ne PROPOSE rien : la liste lui est passée par le parent, qui
 * décide de ce qu'elle contient. Aucune requête ici, donc aucune divergence
 * possible entre « ce qui est affiché » et « ce qui sera envoyé ».
 */
export function ArticlesMultiSelect({
  value,
  onChange,
  articles,
  placeholder = 'Sélectionner des articles…',
  disabled,
  maxSelections,
}: ArticlesMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const updateCoords = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
  }, [])

  useEffect(() => {
    if (!open) return
    updateCoords()
    window.addEventListener('scroll', updateCoords, true)
    window.addEventListener('resize', updateCoords)
    return () => {
      window.removeEventListener('scroll', updateCoords, true)
      window.removeEventListener('resize', updateCoords)
    }
  }, [open, updateCoords])

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const plafondAtteint = maxSelections !== undefined && value.length >= maxSelections

  const toggle = (id: number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      // Au plafond, on ignore le clic plutôt que de tronquer en silence : une
      // sélection de 5 articles qui n'en garde que 4 ne serait pas comprise.
      if (plafondAtteint) return
      onChange([...value, id])
    }
  }

  const remove = (id: number) => onChange(value.filter((v) => v !== id))

  const byId = new Map(articles.map((a) => [a.id, a]))
  const selected = value.map((id) => byId.get(id)).filter((a): a is Article => a !== undefined)

  const lower = search.trim().toLowerCase()
  const filtered = lower
    ? articles.filter((a) =>
        [a.designation, a.reference, a.categorie]
          .filter(Boolean)
          .some((c) => c!.toLowerCase().includes(lower)),
      )
    : articles

  return (
    <div ref={containerRef} className="relative">
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            'flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
            'disabled:cursor-not-allowed disabled:opacity-50',
            selected.length === 0 && 'text-muted-foreground',
          )}
        >
          <div className="flex flex-1 flex-wrap gap-1">
            {selected.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              selected.map((a) => (
                <Badge key={a.id} variant="secondary" className="gap-1 text-xs">
                  <span className="max-w-[180px] truncate">{a.designation}</span>
                  <X
                    className="size-3 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(a.id)
                    }}
                  />
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <input
          autoFocus
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground"
          placeholder="Rechercher par désignation, référence, catégorie…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 rounded-md border bg-card shadow-md"
            style={{ top: coords.top, left: coords.left, width: coords.width, pointerEvents: 'auto' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {articles.length === 0 ? 'Aucun article disponible' : 'Aucun résultat'}
              </p>
            ) : (
              <ul className="max-h-60 overflow-auto py-1">
                {filtered.map((a) => {
                  const pris = value.includes(a.id)
                  const bloquant = !pris && plafondAtteint
                  return (
                    <li
                      key={a.id}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        toggle(a.id)
                      }}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent',
                        bloquant && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <Check
                        className={cn('size-4 shrink-0', pris ? 'opacity-100' : 'opacity-0')}
                      />
                      <span className="flex-1 truncate">{a.designation}</span>
                      {a.reference && (
                        <span className="shrink-0 text-xs text-muted-foreground">{a.reference}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {maxSelections !== undefined && (
              <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
                {value.length} / {maxSelections} sélectionnés
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
