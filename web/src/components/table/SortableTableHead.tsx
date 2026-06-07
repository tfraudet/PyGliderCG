import type { ReactNode } from 'react'
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SharedSortDirection = 'asc' | 'desc'

interface SortableTableHeadProps<TSortKey extends string> {
  label: ReactNode
  sortKey: TSortKey
  activeSortKey: TSortKey
  sortDirection: SharedSortDirection
  onSort: (nextKey: TSortKey) => void
  className?: string
  buttonClassName?: string
}

export function SortableTableHead<TSortKey extends string>({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  className,
  buttonClassName,
}: SortableTableHeadProps<TSortKey>) {
  const isActive = activeSortKey === sortKey

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className={cn('-ml-2 h-8 px-2', buttonClassName)}
        onClick={() => onSort(sortKey)}
      >
        {label}
        {isActive ? (
          sortDirection === 'asc' ? <ArrowUpAZ data-icon="inline-end" /> : <ArrowDownAZ data-icon="inline-end" />
        ) : (
          <ArrowUpDown data-icon="inline-end" />
        )}
      </Button>
    </TableHead>
  )
}
