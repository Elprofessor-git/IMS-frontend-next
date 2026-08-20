'use client'

import { useEffect, useMemo, useState } from 'react'

export function useClientPagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [items.length])

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  )

  const onPageChange = (p: number) => setPage(p)

  return { page, setPage, onPageChange, total, totalPages, pageItems }
}