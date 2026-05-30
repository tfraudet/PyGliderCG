import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown, ClipboardList, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { apiError, backend } from '@/lib/api'
import type { AuditItem } from '@/lib/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

type SortKey = 'timestamp' | 'user_id'
type SortDirection = 'asc' | 'desc'
type PageToken = number | 'ellipsis-left' | 'ellipsis-right'

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('fr-FR')
}

function getPageTokens(pageCount: number, currentPage: number): PageToken[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', pageCount]
  }

  if (currentPage >= pageCount - 3) {
    return [1, 'ellipsis-left', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount]
  }

  return [1, 'ellipsis-left', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-right', pageCount]
}

function sortAuditItems(items: AuditItem[], sortKey: SortKey, sortDirection: SortDirection) {
  return [...items].sort((left, right) => {
    if (sortKey === 'timestamp') {
      const leftValue = new Date(left.timestamp).getTime()
      const rightValue = new Date(right.timestamp).getTime()
      return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue
    }

    const comparedUsers = left.user_id.localeCompare(right.user_id, 'fr', { sensitivity: 'base' })
    if (comparedUsers !== 0) {
      return sortDirection === 'asc' ? comparedUsers : -comparedUsers
    }

    const leftValue = new Date(left.timestamp).getTime()
    const rightValue = new Date(right.timestamp).getTime()
    return rightValue - leftValue
  })
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown data-icon="inline-end" />
  return direction === 'asc' ? <ArrowUpAZ data-icon="inline-end" /> : <ArrowDownAZ data-icon="inline-end" />
}

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  className,
}: {
  label: string
  sortKey: SortKey
  activeSortKey: SortKey
  sortDirection: SortDirection
  onSort: (nextKey: SortKey) => void
  className?: string
}) {
  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 px-2"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <SortIcon active={activeSortKey === sortKey} direction={sortDirection} />
      </Button>
    </TableHead>
  )
}

export function AuditPage() {
  const queryClient = useQueryClient()
  const [sortKey, setSortKey] = useState<SortKey>('timestamp')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const logsQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => backend.getAuditLogs(),
  })

  const clearMutation = useMutation({
    mutationFn: () => backend.clearAuditLogs(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
  })

  const items = logsQuery.data?.items ?? []
  const total = logsQuery.data?.total ?? items.length
  const sortedItems = useMemo(
    () => sortAuditItems(items, sortKey, sortDirection),
    [items, sortKey, sortDirection],
  )
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE))
  const visibleItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedItems.slice(start, start + PAGE_SIZE)
  }, [currentPage, sortedItems])
  const pageTokens = useMemo(() => getPageTokens(pageCount, currentPage), [pageCount, currentPage])
  const visibleStart = sortedItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const visibleEnd = Math.min(currentPage * PAGE_SIZE, sortedItems.length)

  useEffect(() => {
    setCurrentPage(1)
  }, [sortKey, sortDirection])

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, pageCount))
  }, [pageCount])

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === 'timestamp' ? 'desc' : 'asc')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList size={22} className="text-primary" strokeWidth={1.8} />
          <h1 className="text-xl font-bold text-foreground">Audit Log</h1>
          {total > 0 && <Badge variant="secondary">{total}</Badge>}
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5"
          onClick={() => clearMutation.mutate()}
          disabled={clearMutation.isPending || total === 0}
        >
          <Trash2 data-icon="inline-start" />
          {clearMutation.isPending ? 'Suppression…' : 'Effacer'}
        </Button>
      </div>

      {clearMutation.error && (
        <Alert variant="destructive">
          <AlertDescription>{apiError(clearMutation.error)}</AlertDescription>
        </Alert>
      )}

      {logsQuery.error && (
        <Alert variant="destructive">
          <AlertDescription>{apiError(logsQuery.error)}</AlertDescription>
        </Alert>
      )}

      <Card className="border-border/60 bg-card/80">
        <CardHeader className="gap-2 px-4 pt-4 pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Événements récents
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <SortableHeader
                  label="Horodatage"
                  sortKey="timestamp"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-44"
                />
                <SortableHeader
                  label="Utilisateur"
                  sortKey="user_id"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-36"
                />
                <TableHead>Événement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                    Aucun événement enregistré
                  </TableCell>
                </TableRow>
              ) : (
                visibleItems.map((item, index) => (
                  <TableRow
                    key={`${item.timestamp}-${index}`}
                    className="border-border/25 align-top hover:bg-muted/15"
                  >
                    <TableCell className="align-top whitespace-normal py-3 font-mono text-[11px] text-muted-foreground">
                      {formatTimestamp(item.timestamp)}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal py-3">
                      <Badge variant="secondary">{item.user_id}</Badge>
                    </TableCell>
                    <TableCell className="w-full whitespace-pre-wrap break-words py-3 align-top">
                      <div className="flex min-w-0 flex-col gap-2">
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                          {item.event}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {sortedItems.length > 0 && (
          <CardFooter className="flex flex-col items-start justify-between gap-4 border-t border-border/40 px-4 py-4 md:flex-row md:items-center">
            <p className="text-sm text-muted-foreground">
              Affichage de {visibleStart} à {visibleEnd} sur {sortedItems.length} événements
            </p>
            {pageCount > 1 && (
              <Pagination className="mx-0 w-auto justify-start md:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text="Précédent"
                      onClick={(event) => {
                        event.preventDefault()
                        if (currentPage > 1) setCurrentPage(currentPage - 1)
                      }}
                      className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
                    />
                  </PaginationItem>

                  {pageTokens.map((token) => (
                    <PaginationItem key={String(token)}>
                      {typeof token === 'number' ? (
                        <PaginationLink
                          href="#"
                          isActive={token === currentPage}
                          onClick={(event) => {
                            event.preventDefault()
                            setCurrentPage(token)
                          }}
                        >
                          {token}
                        </PaginationLink>
                      ) : (
                        <PaginationEllipsis />
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text="Suivant"
                      onClick={(event) => {
                        event.preventDefault()
                        if (currentPage < pageCount) setCurrentPage(currentPage + 1)
                      }}
                      className={cn(currentPage === pageCount && 'pointer-events-none opacity-50')}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
