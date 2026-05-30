import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Barcode, Calculator, Plane, TriangleAlert, UserRound, UsersRound } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { backend } from '@/lib/api'
import { CentrageTab } from './home-page/CentrageTab'
import { LimitsTab } from './home-page/LimitsTab'
import { EMPTY_PAYLOAD } from './home-page/types'
import { buildChartEnvelopePoints } from './home-page/utils'
import { WeighingTab } from './home-page/WeighingTab'

export function HomePage() {
  const glidersQuery = useQuery({
    queryKey: ['gliders'],
    queryFn: () => backend.getGliders(),
  })
  const [selected, setSelected] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [payload, setPayload] = useState(EMPTY_PAYLOAD)

  const selectedGlider = useMemo(
    () => glidersQuery.data?.find((glider) => glider.registration === selected) ?? null,
    [glidersQuery.data, selected],
  )

  const gliderLimitsQuery = useQuery({
    queryKey: ['gliderLimits', selected],
    queryFn: () => backend.gliderLimits(selected),
    enabled: !!selected,
  })

  const calcMutation = useMutation({
    mutationFn: () => backend.calculateWeightBalance(selected, payload),
  })

  const mvenp = gliderLimitsQuery.data?.mvenp ?? 0
  const enpMass = mvenp
    + payload.front_pilot_weight
    + payload.rear_pilot_weight
    + payload.front_ballast_weight
    + payload.rear_ballast_weight

  const chartEnvelopePoints = useMemo(
    () => buildChartEnvelopePoints(selectedGlider, enpMass),
    [selectedGlider, enpMass],
  )

  useEffect(() => {
    // Keep stale results from a previous glider out of the current view.
    calcMutation.reset()
    setPayload({ ...EMPTY_PAYLOAD })
    setFocusedField(null)
  }, [selected])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Calculator size={22} className="text-primary" strokeWidth={1.8} />
        <h1 className="text-xl font-bold text-foreground">Calculateur de centrage</h1>
      </div>

      <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-200">
        <TriangleAlert size={15} className="text-amber-400" />
        <AlertDescription className="text-xs">
          Attention : Ce logiciel est un outil d'aide à la décision pour le calcul du centrage. La fiche de pesée est le document de référence, et la responsabilité finale du centrage incombe au commandant de bord.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-wrap items-center gap-3">
          <CardTitle>Planeur</CardTitle>

          <Select value={selected} onValueChange={(value: string | null) => { if (value) setSelected(value) }} disabled={glidersQuery.isLoading}>
            <SelectTrigger className="min-w-[15rem] bg-input/50">
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
        </CardHeader>
        <CardContent>
          {selectedGlider && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="bg-purple-50 text-xs font-extralight text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                <Plane size={11} className="mr-1" />
                {selectedGlider.brand}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-xs font-extralight text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                <Barcode size={11} className="mr-1" />
                {selectedGlider.model}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-xs font-extralight text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                {selectedGlider.single_seat ? <UserRound /> : <UsersRound />}
                {selectedGlider.single_seat ? 'Monoplace' : 'Biplace'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGlider && (
        <>
          <Tabs defaultValue="centrage">
            <TabsList className="border border-border/40 bg-muted/40">
              <TabsTrigger value="centrage">Centrage</TabsTrigger>
              <TabsTrigger value="limites">Limites & Bras</TabsTrigger>
              <TabsTrigger value="pesee">Pesée</TabsTrigger>
            </TabsList>

            <CentrageTab
              glider={selectedGlider}
              payload={payload}
              setPayload={setPayload}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              onCalculate={() => calcMutation.mutate()}
              isCalculating={calcMutation.isPending}
              calculation={calcMutation.data}
              calculationError={calcMutation.error}
              enpMass={enpMass}
              envelopePoints={chartEnvelopePoints}
            />

            <LimitsTab glider={selectedGlider} />
            <WeighingTab glider={selectedGlider} limitsData={gliderLimitsQuery.data} />
          </Tabs>

          <Separator className="my-2 bg-border/40" />
        </>
      )}
    </div>
  )
}
