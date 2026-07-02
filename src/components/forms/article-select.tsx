'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchArticles } from '@/hooks/use-articles'
import type { Article } from '@/types/article'

export function articleLabel(a: Article): string {
  return a.reference ? `${a.designation} (${a.reference})` : a.designation
}

interface ArticleSelectProps {
  value: number | null
  onChange: (id: number | null, article?: Article) => void
  selectedArticle?: Article | null
  placeholder?: string
  disabled?: boolean
}

export function ArticleSelect({
  value,
  onChange,
  selectedArticle,
  placeholder = 'Sélectionner un article…',
  disabled,
}: ArticleSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const isSearching = open && debouncedSearch.length >= 2
  const { data: results, isLoading } = useSearchArticles(debouncedSearch, isSearching)

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

  const displayLabel = selectedArticle
    ? articleLabel(selectedArticle)
    : value
    ? `Article #${value}`
    : ''

  function handleSelect(a: Article) {
    onChange(a.id, a)
    setOpen(false)
    setSearch('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
  }

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
            !displayLabel && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          <div className="ml-2 flex shrink-0 items-center gap-1">
            {value !== null && (
              <X
                className="size-3.5 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="size-4 text-muted-foreground" />
          </div>
        </button>
      ) : (
        <input
          autoFocus
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground"
          placeholder="Tapez pour rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-md">
          {debouncedSearch.length < 2 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Saisissez au moins 2 caractères…
            </p>
          ) : isLoading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Recherche…</p>
          ) : !results || results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Aucun article trouvé</p>
          ) : (
            <ul className="max-h-60 overflow-auto py-1">
              {results.map((a) => (
                <li
                  key={a.id}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(a)
                  }}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                >
                  <Check
                    className={cn(
                      'size-4 shrink-0',
                      value === a.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span>{articleLabel(a)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
