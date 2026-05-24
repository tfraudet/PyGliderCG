import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Scale, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiError, backend } from '@/lib/api'
import type { Weighing } from '@/lib/types'

const WEIGHING_LABELS: Record<string, string> = {
  date:                'Date',
  p1:                  'P1 (kg)',
  p2:                  'P2 (kg)',
  A:                   'A (mm)',
  D:                   'D (mm)',
  right_wing_weight:   'Aile droite (kg)',
  left_wing_weight:    'Aile gauche (kg)',
  tail_weight:         'Queue (kg)',
  fuselage_weight:     'Fuselage (kg)',
  fix_ballast_weight:  'Ballast fixe (kg)',
}

const EMPTY_WEIGHING: Weighing = {
  date: new Date().toISOString().slice(0, 10),
  p1: 0, p2: 0, A: 0, D: 0,
  right_wing_weight: 0, left_wing_weight: 0,
  tail_weight: 0, fuselage_weight: 0, fix_ballast_weight: 0,
}

export function WeighingsPage() {
  const queryClient = useQueryClient()
  const [selectedRegistration, setSelectedRegistration] = useState('')
  const [draft, setDraft] = useState<Weighing>({ ...EMPTY_WEIGHING })

  const glidersQuery = useQuery({
    queryKey: ['gliders'],
    queryFn: () => backend.getGliders(),
  })

  const selectedGlider = useMemo(
    () => glidersQuery.data?.find((item) => item.registration === selectedRegistration) ?? null,
    [glidersQuery.data, selectedRegistration],
  )

  const addMutation = useMutation({
    mutationFn: async () => backend.addWeighings(selectedRegistration, [draft]),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gliders'] })
      setDraft({ ...EMPTY_WEIGHING })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (weighingId: number) =>
      backend.deleteWeighing(selectedRegistration, weighingId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gliders'] })
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Scale size={22} className="text-primary" strokeWidth={1.8} />
        <h1
          className="text-xl font-bold text-foreground"
        >
          Pesées
        </h1>
      </div>

      {/* Glider selector */}
      <Card className="border-border/60 bg-card/80">
        <CardContent className="px-4 py-3">
          <Select value={selectedRegistration} onValueChange={(v: string | null) => { if (v) setSelectedRegistration(v) }}>
            <SelectTrigger className="w-64 bg-input/50">
              <SelectValue placeholder="Sélectionner un planeur…" />
            </SelectTrigger>
            <SelectContent>
              {glidersQuery.data?.map((item) => (
                <SelectItem key={item.registration} value={item.registration}>
                  {item.registration}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedGlider && (
        <>
          {/* Existing weighings */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Historique des pesées
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-transparent">
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">P1 (kg)</TableHead>
                      <TableHead className="text-xs">P2 (kg)</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedGlider.weighings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                          Aucune pesée enregistrée
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedGlider.weighings.map((item) => (
                        <TableRow key={item.id} className="border-border/30 hover:bg-muted/20">
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {item.id}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.date}</TableCell>
                          <TableCell className="font-mono text-xs">{item.p1}</TableCell>
                          <TableCell className="font-mono text-xs">{item.p2}</TableCell>
                          <TableCell className="text-right">
                            {item.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => deleteMutation.mutate(item.id!)}
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Add weighing form */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Plus size={13} /> Nouvelle pesée
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {Object.entries(draft).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {WEIGHING_LABELS[key] ?? key}
                    </Label>
                    <Input
                      type={key === 'date' ? 'date' : 'number'}
                      value={value as string | number}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [key]: key === 'date' ? e.target.value : Number(e.target.value),
                        }))
                      }
                      className={`bg-input/50 ${key !== 'date' ? 'font-mono' : ''}`}
                    />
                  </div>
                ))}
              </div>
              <Button
                className="mt-4 gap-2"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending}
              >
                <Plus size={14} />
                {addMutation.isPending ? 'Enregistrement…' : 'Enregistrer la pesée'}
              </Button>
            </CardContent>
          </Card>

          {(addMutation.error || deleteMutation.error) && (
            <Alert variant="destructive">
              <AlertDescription>
                {apiError(addMutation.error ?? deleteMutation.error)}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}


