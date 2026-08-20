'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PaginationBar({
  page,
  totalPages,
  total,
  label,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  label: string
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) {
    return total > 0 ? (
      <p className="text-sm text-muted-foreground">
        {total} {label}
      </p>
    ) : null
  }
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">
        Page {page} sur {totalPages} · {total} {label}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="size-4" />
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Suivant
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}