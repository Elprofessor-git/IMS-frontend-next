'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommandeClient } from '@/types/commande'

export function commandeLabel(c: CommandeClient): string {
  const title = c.titreCommande || c.client?.nom || c.numeroCommande
  const date = new Date(c.dateCommande).toLocaleDateString('fr-FR')
  return `${title} — ${date}`
}

export function CommandeLabel({ commande }: { commande: CommandeClient }) {
  const title = commande.titreCommande || commande.client?.nom || commande.numeroCommande
  const date = new Date(commande.dateCommande).toLocaleDateString('fr-FR')
  return (
    <span className="truncate">
      {title}
      <span className="ml-1.5 text-[13px] text-muted-foreground">{date}</span>
    </span>
  )
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
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Position du menu calculée depuis le déclencheur — le menu est porté (portal) hors du
  // DOM local pour échapper à tout ancêtre `overflow-hidden` (ex. Card) qui le tronquerait.
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
          <span className="truncate">{selected ? <CommandeLabel commande={selected} /> : placeholder}</span>
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
          placeholder="Rechercher par titre, client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          // Dans une modale Radix Dialog (modal), le body reçoit pointer-events:none
          // (disableOutsidePointerEvents) et le Dialog se ferme sur tout pointerdown
          // hors de sa surface : pointer-events:auto rend le menu cliquable et le
          // stopPropagation évite la fermeture du dialog lors d'un clic sur une option.
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
                    <span><CommandeLabel commande={c} /></span>
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
