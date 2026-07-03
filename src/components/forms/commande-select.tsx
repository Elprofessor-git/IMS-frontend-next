'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommandeClient } from '@/types/commande'

export function commandeLabel(c: CommandeClient): string {
  const parts: string[] = [c.numeroCommande]
  if (c.client?.nom) parts.push(c.client.nom)
  if (c.client?.plateforme?.nom) parts.push(c.client.plateforme.nom)
  return parts.join(' — ')
}

interface CommandeSelectProps {
  value: number | null
  onChange: (id: number | null) => void
  commandes: CommandeClient[]
  placeholder?: string
  disabled?: boolean
}

export function CommandeSelect({
  value,
  onChange,
  commandes,
  placeholder = 'Sélectionner une commande…',
  disabled,
}: CommandeSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const selected = value ? (commandes.find((c) => c.id === value) ?? null) : null

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
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !selected && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{selected ? commandeLabel(selected) : placeholder}</span>
          <div className="ml-2 flex shrink-0 items-center gap-1">
            {value !== null && (
              <X
                className="size-3.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null)
                }}
              />
            )}
            <ChevronDown className="size-4 text-muted-foreground" />
          </div>
        </button>
      ) : (
        <input
          autoFocus
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground"
          placeholder="Rechercher par n°, client, plateforme…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-md">
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
                    onChange(c.id)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                >
                  <Check
                    className={cn(
                      'size-4 shrink-0',
                      value === c.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span>{commandeLabel(c)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
