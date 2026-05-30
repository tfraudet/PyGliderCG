import type { ReactNode } from 'react'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface TableStatusRowProps {
  colSpan: number
  children: ReactNode
  className?: string
}

export function TableStatusRow({
  colSpan,
  children,
  className,
}: TableStatusRowProps) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className={cn('h-24 text-center text-muted-foreground', className)}
      >
        {children}
      </TableCell>
    </TableRow>
  )
}
