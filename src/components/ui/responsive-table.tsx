'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type ColDef<T> = {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
  /** Affiché dans le résumé de la carte mobile (toujours visible) */
  cardPrimary?: boolean
  /** Complètement masqué dans les cartes mobiles */
  hideOnMobile?: boolean
}

type Props<T> = {
  columns: ColDef<T>[]
  data: T[]
  keyExtractor: (row: T) => React.Key
  isLoading?: boolean
  emptyText?: string
  loadingRows?: number
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyText = 'Aucune donnée.',
  loadingRows = 5,
}: Props<T>) {
  const [expanded, setExpanded] = useState<Set<React.Key>>(new Set())

  const primaryCols   = columns.filter((c) => c.cardPrimary && !c.hideOnMobile)
  const secondaryCols = columns.filter((c) => !c.cardPrimary && !c.hideOnMobile)

  const toggle = (key: React.Key) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  return (
    <>
      {/* ── Desktop : tableau classique ──────────────────────────────────── */}
      <div className="hidden md:block rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.headerClassName}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: loadingRows }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-10 text-center text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              data.map((row) => (
                <TableRow key={keyExtractor(row)}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile : cartes empilées ──────────────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {isLoading &&
          Array.from({ length: loadingRows }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}

        {!isLoading && data.length === 0 && (
          <div className="rounded-lg border bg-card py-10 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        )}

        {!isLoading &&
          data.map((row) => {
            const key        = keyExtractor(row)
            const isExpanded = expanded.has(key)
            return (
              <div key={key} className="rounded-lg border bg-card divide-y overflow-hidden">
                {/* Colonnes primaires — toujours visibles */}
                <div className="p-3 space-y-1.5">
                  {primaryCols.map((col) => (
                    <div key={col.key}>{col.cell(row)}</div>
                  ))}
                </div>

                {/* Colonnes secondaires — accordéon */}
                {secondaryCols.length > 0 && (
                  <>
                    {isExpanded && (
                      <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {secondaryCols.map((col) => (
                          <div key={col.key}>
                            <span className="block text-[11px] text-muted-foreground mb-0.5">
                              {col.header}
                            </span>
                            {col.cell(row)}
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      className="flex w-full items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
                      onClick={() => toggle(key)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="size-3" /> Moins
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3" /> Détails
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )
          })}
      </div>
    </>
  )
}
