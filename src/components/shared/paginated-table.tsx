'use client'

import {
  ResponsiveTable,
  type ColDef,
} from '@/components/ui/responsive-table'
import { PaginationBar } from '@/components/shared/pagination'
import { useClientPagination } from '@/hooks/use-client-pagination'

type Props<T> = {
  columns: ColDef<T>[]
  data: T[]
  keyExtractor: (row: T) => React.Key
  isLoading?: boolean
  emptyText?: string
  loadingRows?: number
  label: string
  pageSize?: number
}

export function PaginatedResponsiveTable<T>({
  label,
  pageSize = 10,
  ...tableProps
}: Props<T>) {
  const pagination = useClientPagination(tableProps.data, pageSize)
  return (
    <>
      <ResponsiveTable {...tableProps} data={pagination.pageItems} />
      <PaginationBar {...pagination} label={label} />
    </>
  )
}