import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Calculator, TriangleAlert, PlaneTakeoff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { apiError, backend } from '@/lib/api'

const PAYLOAD_LABELS: Record<string, string> = {
  front_pilot_weight:       'Pilote avant (kg)',
  rear_pilot_weight:        'Pilote arrière (kg)',
  front_ballast_weight:     'Ballast avant (kg)',
  rear_ballast_weight:      'Ballast arrière (kg)',
  wing_water_ballast_weight:'Ballast eau ailes (kg)',
}

export function HomePage() {
  const glidersQuery = useQuery({
    queryKey: ['gliders'],
    queryFn: () => backend.getGliders(),
  })
  const [selected, setSelected] = useState('')
  const [payload, setPayload] = useState({
    front_pilot_weight: 0,
    rear_pilot_weight: 0,
    front_ballast_weight: 0,
    rear_ballast_weight: 0,
    wing_water_ballast_weight: 0,
  })

  const selectedGlider = useMemo(
    () => glidersQuery.data?.find((g) => g.registration === selected) ?? null,
    [glidersQuery.data, selected],
  )

  const limitsQuery = useQuery({
    queryKey: ['limits', selected],
    queryFn: () => backend.gliderLimits(selected),
    enabled: Boolean(selected),
  })

  const calcMutation = useMutation({
    mutationFn: () => backend.calculateWeightBalance(selected, payload),
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calculator size={22} className="text-primary" strokeWidth={1.8} />
        <h1
          className="text-xl font-bold text-foreground"
        >
          Calculateur de centrage
        </h1>
      </div>

      <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-200">
        <TriangleAlert size={15} className="text-amber-400" />
        <AlertDescription className="text-xs">
          Attention : Ce logiciel est un outil d'aide à la décision pour le calcul du centrage. La fiche de pesée est le document de référence, et la responsabilité finale du centrage incombe au commandant de bord.
        </AlertDescription>
      </Alert>

      {/* Glider selector */}
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Sélection du planeur
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Select value={selected} onValueChange={(v: string | null) => { if (v) setSelected(v) }} disabled={glidersQuery.isLoading}>
            <SelectTrigger className="bg-input/50">
              <SelectValue placeholder={glidersQuery.isLoading ? 'Chargement…' : 'Sélectionner un planeur…'} />
            </SelectTrigger>
            <SelectContent>
              {glidersQuery.data?.map((glider) => (
                <SelectItem key={glider.registration} value={glider.registration}>
                  {glider.registration} — {glider.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedGlider && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">
                <PlaneTakeoff size={11} className="mr-1" />
                {selectedGlider.brand}
              </Badge>
              <Badge variant="secondary" className="text-xs">{selectedGlider.model}</Badge>
              <Badge variant="outline" className="text-xs">
                {selectedGlider.single_seat ? 'Monoplace' : 'Biplace'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGlider && (
        <>
          {/* Weight inputs */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Masses embarquées
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(payload).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {PAYLOAD_LABELS[key] ?? key}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={value}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPayload((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                      }
                      className="bg-input/50 font-mono"
                    />
                  </div>
                ))}
              </div>
              <Button
                className="mt-4 gap-2"
                onClick={() => calcMutation.mutate()}
                disabled={calcMutation.isPending}
              >
                <Calculator size={15} />
                {calcMutation.isPending ? 'Calcul…' : 'Calculer le centrage'}
              </Button>
            </CardContent>
          </Card>

          {/* Error */}
          {calcMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>{apiError(calcMutation.error)}</AlertDescription>
            </Alert>
          )}

          {/* Result */}
          {calcMutation.data && (
            <Card className="border-primary/30 bg-primary/8">
              <CardContent className="px-4 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
                  Résultat du calcul
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border/50 bg-card/60 p-3">
                    <p className="text-xs text-muted-foreground">Masse totale</p>
                    <p className="font-mono text-xl font-bold text-foreground">
                      {calcMutation.data.total_weight}{' '}
                      <span className="text-sm font-normal text-muted-foreground">kg</span>
                    </p>
                  </div>
                  <div className="rounded-md border border-primary/40 bg-primary/10 p-3">
                    <p className="text-xs text-muted-foreground">Centrage</p>
                    <p className="font-mono text-xl font-bold text-primary">
                      {calcMutation.data.center_of_gravity}{' '}
                      <span className="text-sm font-normal text-muted-foreground">mm</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Limits */}
          {limitsQuery.data && (
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Limites opérationnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { label: 'MVE',   value: limitsQuery.data.mve },
                    { label: 'MVENP', value: limitsQuery.data.mvenp },
                    { label: 'CU max',value: limitsQuery.data.cu_max },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-md border border-border/50 bg-card/40 p-2.5 text-center">
                      <p className="text-[11px] text-muted-foreground">{label}</p>
                      <p className="font-mono text-sm font-semibold text-foreground">{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator className="my-2 bg-border/40" />
        </>
      )}
    </div>
  )
}
