import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import { Calculator, Minus, Plus, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { TabsContent } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { apiError } from '@/lib/api'
import type { Glider, WeightBalanceResult } from '@/lib/types'
import { PAYLOAD_LABELS, PAYLOAD_SECTIONS } from './config'
import type { AutoBallastResult, ChartPoint, PayloadKey, PayloadState, RearBallastMode } from './types'
import { getPayloadFieldState } from './utils'
import { WeightBalanceGraph } from './WeightBalanceGraph'

const formatKg = (value: number) =>
  `${value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`

interface CentrageTabProps {
  glider: Glider
  payload: PayloadState
  setPayload: Dispatch<SetStateAction<PayloadState>>
  rearBallastMode: RearBallastMode
  setRearBallastMode: Dispatch<SetStateAction<RearBallastMode>>
  targetCgPercent: number
  setTargetCgPercent: Dispatch<SetStateAction<number>>
  autoBallast: AutoBallastResult | null
  focusedField: string | null
  setFocusedField: Dispatch<SetStateAction<string | null>>
  onCalculate: () => void
  isCalculating: boolean
  calculation: WeightBalanceResult | null | undefined
  calculationError: unknown
  enpMass: number
  envelopePoints: ChartPoint[]
}

interface ResultStatusCardProps {
  label: string
  value: string
  passed: boolean
  detail: string
  bordered?: boolean
}

function ResultStatusCard({ label, value, passed, detail, bordered }: ResultStatusCardProps) {
  return (
    <div className={`space-y-2 text-center ${bordered ? 'sm:border-r sm:border-border/40 sm:pr-4' : ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono text-2xl font-bold ${passed ? 'text-green-500' : 'text-red-500'}`}>
        {value}
      </p>
      <div className="flex items-center justify-center gap-2">
        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {passed ? (
            <span className="text-xs text-green-500">✓</span>
          ) : (
            <X size={14} className="text-red-500" />
          )}
        </div>
        <p className={`text-xs font-semibold ${passed ? 'text-green-500' : 'text-red-500'}`}>
          {passed ? 'Pass' : 'Failed'}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

export function CentrageTab({
  glider,
  payload,
  setPayload,
  rearBallastMode,
  setRearBallastMode,
  targetCgPercent,
  setTargetCgPercent,
  autoBallast,
  focusedField,
  setFocusedField,
  onCalculate,
  isCalculating,
  calculation,
  calculationError,
  enpMass,
  envelopePoints,
}: CentrageTabProps) {
  const updatePayload = (key: PayloadKey, value: number) => {
    setPayload((previous) => ({ ...previous, [key]: value }))
  }

  const handlePayloadChange = (key: PayloadKey, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? 0 : Number(event.target.value) || 0
    updatePayload(key, value)
  }

  const stepPayload = (key: PayloadKey, delta: number) => {
    setPayload((previous) => ({
      ...previous,
      [key]: Math.max(0, previous[key] + delta),
    }))
  }

  const isCenteringPassed = calculation
    ? calculation.center_of_gravity >= glider.limits.front_centering
      && calculation.center_of_gravity <= glider.limits.rear_centering
    : false
  const isWeightPassed = calculation ? calculation.total_weight <= glider.limits.mmwp : false
  const isEnpMassPassed = enpMass <= glider.limits.mmenp
  const calculationErrorMessage = calculationError ? apiError(calculationError) : null
  const harnessMax = glider?.limits.mm_harnais ?? 0
  const isHarnessLimitExceeded = payload.front_pilot_weight > harnessMax || payload.rear_pilot_weight > harnessMax
  const isAuto = rearBallastMode === 'auto' && autoBallast !== null

  return (
    <TabsContent value="centrage" className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {PAYLOAD_SECTIONS.map(({ title, icon: Icon, fields }) => (
          <Card key={title} className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon size={18} className="text-blue-600 text-primary dark:text-sky-400" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              {fields.map((key) => {
                const { isDisabled, showHarnessError, canIncrement } = getPayloadFieldState(key, glider, payload, focusedField)
                const isRearBallast = key === 'rear_ballast_weight'
                const showAuto = isRearBallast && isAuto && autoBallast !== null

                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className={`text-xs ${isDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                        {PAYLOAD_LABELS[key]}
                      </Label>
                      {isRearBallast && (
                        <ToggleGroup
                          aria-label="Mode de calcul de la gueuse arrière"
                          value={[showAuto ? 'auto' : 'manual']}
                          onValueChange={(value) => {
                            if (value[0]) setRearBallastMode(value[0] as RearBallastMode)
                          }}
                          className="shrink-0"
                        >
                          <ToggleGroupItem value="manual">Manuel</ToggleGroupItem>
                          <ToggleGroupItem
                            value="auto"
                            disabled={isDisabled || autoBallast === null}
                            title={isDisabled || autoBallast === null ? 'Calcul automatique indisponible pour ce planeur' : undefined}
                          >
                            Auto
                          </ToggleGroupItem>
                        </ToggleGroup>
                      )}
                    </div>
                    {showAuto ? (
                      <>
                        <div
                          data-testid="rear-ballast-auto-value"
                          className="flex h-10 items-center justify-center gap-2 rounded-md border border-sky-500/50 bg-sky-500/10 px-3 font-mono text-sm"
                        >
                          {formatKg(autoBallast.mass)}
                          <Badge variant="outline" className="border-sky-500/50 text-[10px] font-normal text-sky-500">
                            calculé
                          </Badge>
                        </div>
                        <div className="space-y-3 rounded-md border border-border/60 bg-background/40 p-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-medium">Centrage cible</span>
                            <span className="font-mono text-sm font-semibold text-sky-400">{targetCgPercent} %</span>
                          </div>
                          <Slider
                            aria-label="Centrage cible"
                            min={0}
                            max={100}
                            step={1}
                            value={targetCgPercent}
                            onValueChange={(value) => setTargetCgPercent(typeof value === 'number' ? value : value[0])}
                          />
                          <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                            <span>0 % · limite AV</span>
                            <span>limite AR · 100 %</span>
                          </div>
                          {autoBallast.reachable ? (
                            <p className="flex items-center gap-2 text-xs text-green-400">
                              <span className="size-1.5 shrink-0 rounded-full bg-green-400" />
                              Centrage {Math.round(autoBallast.currentPercent)} % → {targetCgPercent} % avec la gueuse de queue.
                            </p>
                          ) : (
                            <p className="flex items-center gap-2 text-xs text-amber-400">
                              <span className="size-1.5 shrink-0 rounded-full bg-amber-400" />
                              Centrage déjà à {Math.round(autoBallast.currentPercent)} % sans gueuse de queue : cible non atteignable.
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={payload[key] || ''}
                        onChange={(event) => handlePayloadChange(key, event)}
                        onFocus={() => setFocusedField(key)}
                        onBlur={() => setFocusedField(null)}
                        placeholder="0"
                        disabled={isDisabled}
                        className={`font-mono text-center [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden ${showHarnessError ? 'border-red-500 focus-visible:ring-red-500/50' : ''}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isDisabled}
                        onClick={() => stepPayload(key, -0.5)}
                        className="h-10 w-10"
                      >
                        <Minus size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isDisabled || !canIncrement}
                        onClick={() => stepPayload(key, 0.5)}
                        className="h-10 w-10"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    )}
                    {showHarnessError && (
                      <p className="text-xs font-medium text-red-500">
                        Dépasse le poids max du harnais ({glider.limits.mm_harnais} kg)
                      </p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <Button
          className="w-full gap-2 md:w-auto"
          onClick={onCalculate}
          disabled={isCalculating || isHarnessLimitExceeded}
        >
          <Calculator size={15} />
          {isCalculating ? 'Calcul…' : 'Calculer le centrage'}
        </Button>
      </div>

      {calculationErrorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{calculationErrorMessage}</AlertDescription>
        </Alert>
      )}

      {calculation && !isHarnessLimitExceeded && (
        <>
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Résultats du calcul</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <ResultStatusCard
                  label="Centrage (mm)"
                  value={`${calculation.center_of_gravity.toFixed(1)} mm`}
                  passed={isCenteringPassed}
                  detail={`(Limites: ${glider.limits.front_centering}-${glider.limits.rear_centering} mm)`}
                  bordered
                />
                <ResultStatusCard
                  label="Masse totale (kg)"
                  value={`${calculation.total_weight.toFixed(1)} kg`}
                  passed={isWeightPassed}
                  detail={`(Max: ${glider.limits.mmwp} kg)`}
                  bordered
                />
                <ResultStatusCard
                  label="Masse éléments non portants + occupants + gueuse & water ballast arrière"
                  value={`${enpMass.toFixed(1)} kg`}
                  passed={isEnpMassPassed}
                  detail={`(Max: ${glider.limits.mmenp} kg)`}
                />
              </div>
            </CardContent>
          </Card>

          <WeightBalanceGraph
            envelopePoints={envelopePoints}
            centerOfGravity={calculation.center_of_gravity}
            totalWeight={calculation.total_weight}
            enpMass={enpMass}
            mmenp={glider.limits.mmenp}
            frontCentering={glider.limits.front_centering}
            rearCentering={glider.limits.rear_centering}
          />
        </>
      )}
    </TabsContent>
  )
}
