import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiError, backend } from '@/lib/api'

const EVENT_COLOR: Record<string, string> = {
  CREATE: 'bg-primary/10 text-primary border-primary/30',
  UPDATE: 'bg-secondary text-secondary-foreground border-border',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/30',
  LOGIN:  'bg-muted text-muted-foreground border-border',
  LOGOUT: 'bg-muted/50 text-muted-foreground border-border/40',
}

function eventBadgeClass(event: string) {
  const key = Object.keys(EVENT_COLOR).find((k) => event.toUpperCase().includes(k))
  return key ? EVENT_COLOR[key] : 'bg-muted/50 text-muted-foreground border-border/40'
}

export function AuditPage() {
  const queryClient = useQueryClient()
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

  const total = logsQuery.data?.items.length ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList size={22} className="text-primary" strokeWidth={1.8} />
          <h1
            className="text-xl font-bold text-foreground"
          >
            Audit Log
          </h1>
          {total > 0 && (
            <Badge variant="secondary" className="text-xs font-mono">
              {total}
            </Badge>
          )}
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5"
          onClick={() => clearMutation.mutate()}
          disabled={clearMutation.isPending || total === 0}
        >
          <Trash2 size={14} />
          {clearMutation.isPending ? 'Suppression…' : 'Effacer'}
        </Button>
      </div>

      {clearMutation.error && (
        <Alert variant="destructive">
          <AlertDescription>{apiError(clearMutation.error)}</AlertDescription>
        </Alert>
      )}

      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Événements récents
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-xs w-40">Horodatage</TableHead>
                    <TableHead className="text-xs w-28">Utilisateur</TableHead>
                    <TableHead className="text-xs">Événement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-8">
                        Chargement…
                      </TableCell>
                    </TableRow>
                  ) : total === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-8">
                        Aucun événement enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    logsQuery.data?.items.map((item, index) => (
                      <TableRow
                        key={`${item.timestamp}-${index}`}
                        className="border-border/25 align-top hover:bg-muted/15"
                      >
                        <TableCell className="py-2 font-mono text-[11px] text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="py-2 text-xs font-medium">{item.user_id}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-wrap items-start gap-2">
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-[10px] px-1.5 py-0 ${eventBadgeClass(item.event)}`}
                            >
                              {item.event.split(' ')[0]}
                            </Badge>
                            <span className="text-xs text-muted-foreground leading-tight">
                              {item.event}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}


