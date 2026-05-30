import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Trash2 } from 'lucide-react'
import { QueryErrorAlert } from '@/components/QueryErrorAlert'
import { PageNavigation } from '@/components/table/PageNavigation'
import { SortableTableHead } from '@/components/table/SortableTableHead'
import { TableStatusRow } from '@/components/table/TableStatusRow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { backend } from '@/lib/api'
import { invalidateAuditLogsQuery, useAuditLogs } from '@/hooks/use-app-queries'
import { getPageTokens } from '@/lib/pagination'
import type { AuditItem } from '@/lib/types'

const PAGE_SIZE = 50

type SortKey = 'timestamp' | 'user_id'
type SortDirection = 'asc' | 'desc'

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('fr-FR')
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

export function AuditPage() {
  const queryClient = useQueryClient()
  const [sortKey, setSortKey] = useState<SortKey>('timestamp')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const logsQuery = useAuditLogs()

  const clearMutation = useMutation({
    mutationFn: () => backend.clearAuditLogs(),
    onSuccess: async () => {
      await invalidateAuditLogsQuery(queryClient)
    },
  })

  const items = useMemo(() => logsQuery.data?.items ?? [], [logsQuery.data])
  const total = logsQuery.data?.total ?? items.length
  const sortedItems = useMemo(
    () => sortAuditItems(items, sortKey, sortDirection),
    [items, sortKey, sortDirection],
  )
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE))
  const effectiveCurrentPage = Math.min(currentPage, pageCount)
  const visibleItems = useMemo(() => {
    const start = (effectiveCurrentPage - 1) * PAGE_SIZE
    return sortedItems.slice(start, start + PAGE_SIZE)
  }, [effectiveCurrentPage, sortedItems])
  const pageTokens = useMemo(
    () => getPageTokens(pageCount, effectiveCurrentPage, { edgeWindow: 5 }),
    [effectiveCurrentPage, pageCount],
  )
  const visibleStart = sortedItems.length === 0 ? 0 : (effectiveCurrentPage - 1) * PAGE_SIZE + 1
  const visibleEnd = Math.min(effectiveCurrentPage * PAGE_SIZE, sortedItems.length)

  const handleSort = (nextKey: SortKey) => {
    setCurrentPage(1)
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

      <QueryErrorAlert error={clearMutation.error} />
      <QueryErrorAlert error={logsQuery.error} />

      <div className="space-y-4">
        <div className="rounded-lg border border-border/80">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableTableHead
                  label="Horodatage"
                  sortKey="timestamp"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-44"
                />
                <SortableTableHead
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
                <TableStatusRow colSpan={3} className="py-8 text-sm">
                  Chargement…
                </TableStatusRow>
              ) : sortedItems.length === 0 ? (
                <TableStatusRow colSpan={3} className="py-8 text-sm">
                  Aucun événement enregistré
                </TableStatusRow>
              ) : (
                visibleItems.map((item, index) => (
                  <TableRow
                    key={`${item.timestamp}-${index}`}
                    className="align-top"
                  >
                    <TableCell className="align-top whitespace-normal py-3 font-mono text-[11px] text-muted-foreground">
                      {formatTimestamp(item.timestamp)}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal py-3">
                      <Badge variant="secondary">{item.user_id}</Badge>
                    </TableCell>
                    <TableCell className="w-full whitespace-pre-wrap break-words py-3 align-top">
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                        {item.event}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {sortedItems.length > 0 && (
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <p className="text-sm text-muted-foreground">
              Affichage de {visibleStart} à {visibleEnd} sur {sortedItems.length} événements
            </p>
            <PageNavigation
              currentPage={effectiveCurrentPage}
              pageCount={pageCount}
              pageTokens={pageTokens}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
