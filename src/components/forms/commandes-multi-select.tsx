'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { CommandeClient } from '@/types/commande'

function commandeLabel(c: CommandeClient): string {
  const title = c.titreCommande || c.client?.nom || c.numeroCommande
  const date = new Date(c.dateCommande).toLocaleDateString('fr-FR')
  return `${title} — ${date}`
}

interface CommandesMultiSelectProps {
  value: number[]
  onChange: (ids: number[]) => void
  commandes: CommandeClient[]
  placeholder?: string
  disabled?: boolean
}

export function CommandesMultiSelect({
  value,
  onChange,
  commandes,
  placeholder = 'Sélectionner des commandes…',
  disabled,
}: CommandesMultiSelectProps) {
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

  const toggle = (id: number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  const remove = (id: number) => {
    onChange(value.filter((v) => v !== id))
  }

  const selected = commandes.filter((c) => value.includes(c.id))

  const lowerSearch = search.trim().toLowerCase()
  const filtered = lowerSearch
    ? commandes.filter((c) => commandeLabel(c).toLowerCase().includes(lowerSearch))
    : commandes

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
              selected.map((c) => (
                <Badge key={c.id} variant="secondary" className="gap-1 text-xs">
                  <span className="max-w-[180px] truncate">{commandeLabel(c)}</span>
                  <X
                    className="size-3 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(c.id)
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
          placeholder="Rechercher par titre, client…"
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
                {commandes.length === 0 ? 'Aucune commande disponible' : 'Aucun résultat'}
              </p>
            ) : (
              <ul className="max-h-60 overflow-auto py-1">
                {filtered.map((c) => (
                  <li
                    key={c.id}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      toggle(c.id)
                    }}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        value.includes(c.id) ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{commandeLabel(c)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
