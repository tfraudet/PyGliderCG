import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import { Calculator, Minus, Plus, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'
import { apiError } from '@/lib/api'
import type { Glider, WeightBalanceResult } from '@/lib/types'
import { PAYLOAD_LABELS, PAYLOAD_SECTIONS } from './config'
import type { ChartPoint, PayloadKey, PayloadState } from './types'
import { getPayloadFieldState } from './utils'
import { WeightBalanceGraph } from './WeightBalanceGraph'

interface CentrageTabProps {
  glider: Glider
  payload: PayloadState
  setPayload: Dispatch<SetStateAction<PayloadState>>
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

                return (
                  <div key={key} className="space-y-1.5">
                    <Label className={`text-xs ${isDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                      {PAYLOAD_LABELS[key]}
                    </Label>
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

      <Button
        className="w-full gap-2 md:w-auto"
        onClick={onCalculate}
        disabled={isCalculating || isHarnessLimitExceeded}
      >
        <Calculator size={15} />
        {isCalculating ? 'Calcul…' : 'Calculer le centrage'}
      </Button>

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
