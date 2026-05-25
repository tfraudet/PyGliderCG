import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Calculator, TriangleAlert, UserRound, UsersRound, Barcode, Plane, Plus, Minus, Users, Droplet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { apiError, backend } from '@/lib/api'
import type { Arms, Limits } from '@/lib/types'

const PAYLOAD_LABELS: Record<string, string> = {
  front_pilot_weight:       'Masse pilote avant équipé (en kg)',
  rear_pilot_weight:        'Masse pilote arrière équipé (kg))',
  front_ballast_weight:     'Masse Gueuse avant (kg)',
  rear_ballast_weight:      'Masse Gueuse ou water ballast arrière (kg)',
  wing_water_ballast_weight:'Masse d\'eau dans les ailes (kg)',
}

const PAYLOAD_SECTIONS = [
  {
    title: 'Poids Pilotes & Gueuse',
    icon: Users,
    fields: ['front_pilot_weight', 'rear_pilot_weight', 'front_ballast_weight'],
  },
  {
    title: 'Ballast d\'eau',
    icon: Droplet,
    fields: ['wing_water_ballast_weight', 'rear_ballast_weight'],
  },
]

const MASS_LIMIT_FIELDS: Array<{ key: keyof Limits, label: string }> = [
  { key: 'mmwp', label: 'MMWP (kg)' },
  { key: 'mmwv', label: 'MMWV (kg)' },
  { key: 'mmenp', label: 'MMENP (kg)' },
  { key: 'mm_harnais', label: 'MMHarnais (kg)' },
  { key: 'weight_min_pilot', label: 'Masse mini pilote (kg)' },
]

const CENTERING_LIMIT_FIELDS: Array<{ key: keyof Limits, label: string }> = [
  { key: 'front_centering', label: 'Centrage avant (mm)' },
  { key: 'rear_centering', label: 'Centrage arrière (mm)' },
]

const ARM_FIELDS: Array<{ key: keyof Arms, label: string }> = [
  { key: 'arm_front_pilot', label: 'Bras de levier pilote avant(mm)' },
  { key: 'arm_rear_pilot', label: 'Bras de levier pilote arrière (mm)' },
  { key: 'arm_waterballast', label: 'Bras de levier waterballast (mm)' },
  { key: 'arm_front_ballast', label: 'Bras de levier gueuse avant (mm)' },
  { key: 'arm_rear_watterballast_or_ballast', label: 'Bras de levier ballast ou gueuse arrière (mm)' },
  { key: 'arm_instruments_panel', label: 'Bras de levier tableau de bord (mm)' },
]

type ChartPoint = { x: number; y: number }

const CHART_COLORS = {
  envelope: '#2ecbff',
  enpPoint: '#ff33ff',
  cgPoint: '#3cff4e',
  mmenp: '#d321ff',
  grid: 'rgba(255, 255, 255, 0.22)',
  axis: 'rgba(255, 255, 255, 0.6)',
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const niceStep = (rawStep: number) => {
  const exponent = Math.floor(Math.log10(rawStep))
  const base = 10 ** exponent
  const normalized = rawStep / base
  if (normalized <= 1) return 1 * base
  if (normalized <= 2) return 2 * base
  if (normalized <= 5) return 5 * base
  return 10 * base
}

function createAxisTicks(min: number, max: number, targetTickCount: number) {
  const fallback = {
    min: 0,
    max: 1,
    ticks: [0, 1],
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback

  let minValue = min
  let maxValue = max
  if (minValue === maxValue) {
    minValue -= 1
    maxValue += 1
  }

  const padding = Math.max((maxValue - minValue) * 0.08, 1)
  const paddedMin = minValue - padding
  const paddedMax = maxValue + padding
  const step = niceStep((paddedMax - paddedMin) / Math.max(targetTickCount, 1))
  const axisMin = Math.floor(paddedMin / step) * step
  const axisMax = Math.ceil(paddedMax / step) * step

  const ticks: number[] = []
  for (let i = 0; i < 200; i += 1) {
    const tick = axisMin + i * step
    if (tick > axisMax + step / 2) break
    ticks.push(Number(tick.toFixed(4)))
  }

  return {
    min: axisMin,
    max: axisMax,
    ticks: ticks.length > 1 ? ticks : [axisMin, axisMax],
  }
}

const formatTick = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

function WeightBalanceGraph({
  envelopePoints,
  centerOfGravity,
  totalWeight,
  enpMass,
  mmenp,
  frontCentering,
  rearCentering,
}: {
  envelopePoints: ChartPoint[]
  centerOfGravity: number
  totalWeight: number
  enpMass: number
  mmenp: number
  frontCentering: number
  rearCentering: number
}) {
  const width = 960
  const height = 560
  const margin = { top: 24, right: 32, bottom: 56, left: 54 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const chartPoints = envelopePoints.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  const [isCgHovered, setIsCgHovered] = useState(false)
  const [isEnpHovered, setIsEnpHovered] = useState(false)

  if (!chartPoints.length) {
    return null
  }

  const xValues = [...chartPoints.map((point) => point.x), centerOfGravity, frontCentering, rearCentering]
  const yValues = [...chartPoints.map((point) => point.y), totalWeight, enpMass, mmenp]
  const xAxis = createAxisTicks(Math.min(...xValues), Math.max(...xValues), 8)
  const yAxis = createAxisTicks(Math.min(...yValues), Math.max(...yValues), 10)

  const toX = (value: number) =>
    margin.left + ((value - xAxis.min) / Math.max(xAxis.max - xAxis.min, 1)) * plotWidth
  const toY = (value: number) =>
    margin.top + ((yAxis.max - value) / Math.max(yAxis.max - yAxis.min, 1)) * plotHeight

  const closedEnvelope = chartPoints.length >= 3 ? [...chartPoints, chartPoints[0]] : chartPoints
  const envelopePolyline = closedEnvelope.map((point) => `${toX(point.x)},${toY(point.y)}`).join(' ')
  const cgX = toX(centerOfGravity)
  const totalY = toY(totalWeight)
  const enpY = toY(enpMass)
  const mmenpY = toY(mmenp)
  const centeringPercent = frontCentering === rearCentering
    ? 0
    // : clamp(((centerOfGravity - frontCentering) / (rearCentering - frontCentering)) * 100, 0, 100)
    : ((centerOfGravity - frontCentering) / (rearCentering - frontCentering)) * 100
  const tooltipLines = [
    `Centrage calculé: ${centerOfGravity.toFixed(1)} mm`,
    `Masse totale: ${totalWeight.toFixed(1)} kg`,
    `Position dans l'enveloppe: ${centeringPercent.toFixed(1)}%`,
  ]
  const tooltipWidth = 210
  const tooltipHeight = 60
  const tooltipX = clamp(cgX + 14, margin.left + 6, width - margin.right - tooltipWidth - 6)
  const tooltipY = clamp(totalY - tooltipHeight - 8, margin.top + 6, height - margin.bottom - tooltipHeight - 6)
  const enpTooltipLines = [
    `Masse ENP calculée: ${enpMass.toFixed(1)} kg`,
    `Limite MMENP: ${mmenp.toFixed(1)} kg`,
    `Marge restante: ${(mmenp - enpMass).toFixed(1)} kg`,
  ]
  const enpTooltipWidth = 190
  const enpTooltipHeight = 60
  const enpTooltipX = clamp(cgX - enpTooltipWidth - 14, margin.left + 6, width - margin.right - enpTooltipWidth - 6)
  const enpTooltipY = clamp(enpY - enpTooltipHeight - 8, margin.top + 6, height - margin.bottom - enpTooltipHeight - 6)

  return (
    <div className="mt-5 rounded-lg border border-border/60 bg-card p-3">
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="block w-full h-auto">
          <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="transparent" />

          {yAxis.ticks.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={toY(tick)}
                y2={toY(tick)}
                stroke={CHART_COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={margin.left - 8}
                y={toY(tick) + 4}
                textAnchor="end"
                  className='fill-muted-foreground text-xs font-sans antialiased select-none'
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {xAxis.ticks.map((tick) => (
            <g key={`x-${tick}`}>
              <line
                x1={toX(tick)}
                x2={toX(tick)}
                y1={margin.top}
                y2={height - margin.bottom}
                stroke={CHART_COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={toX(tick)}
                y={height - margin.bottom + 16}
                textAnchor="middle"
                className='fill-muted-foreground text-xs font-sans antialiased select-none'

              >
                {formatTick(tick)}
              </text>
            </g>
          ))}

          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={height - margin.bottom}
            y2={height - margin.bottom}
            stroke={CHART_COLORS.axis}
            strokeWidth={1}
          />
          <line
            x1={margin.left}
            x2={margin.left}
            y1={margin.top}
            y2={height - margin.bottom}
            stroke={CHART_COLORS.axis}
            strokeWidth={1}
          />

          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={mmenpY}
            y2={mmenpY}
            stroke={CHART_COLORS.mmenp}
            strokeWidth={2}
          />
          <text
            x={width - margin.right - 4}
            y={mmenpY - 8}
            textAnchor="end"
            className='fill-foreground text-sm font-semibold font-sans antialiased select-none'

          >
            Masse maximum éléments non portants: {mmenp.toFixed(1)} kg
          </text>

          <polyline
            points={envelopePolyline}
            fill="none"
            stroke={CHART_COLORS.envelope}
            strokeWidth={2}
          />
          {chartPoints.map((point, index) => (
            <circle
              key={`envelope-point-${index}`}
              cx={toX(point.x)}
              cy={toY(point.y)}
              r={2.8}
              fill={CHART_COLORS.envelope}
            />
          ))}

          <line
            x1={margin.left}
            x2={cgX}
            y1={totalY}
            y2={totalY}
            stroke={CHART_COLORS.cgPoint}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <line
            x1={cgX}
            x2={cgX}
            y1={height - margin.bottom}
            y2={totalY}
            stroke={CHART_COLORS.cgPoint}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />

          <g>
            <rect x={cgX - 5} y={enpY - 5} width={10} height={10} fill={CHART_COLORS.enpPoint} />
            <rect
              x={cgX - 6}
              y={enpY - 6}
              width={12}
              height={12}
              fill="rgba(0, 0, 0, 0.001)"
              pointerEvents="all"
              onMouseEnter={() => setIsEnpHovered(true)}
              onMouseLeave={() => setIsEnpHovered(false)}
              onFocus={() => setIsEnpHovered(true)}
              onBlur={() => setIsEnpHovered(false)}
              tabIndex={0}
            />
          </g>
          <g>
            <polygon
              points={`${cgX},${totalY - 7} ${cgX + 7},${totalY} ${cgX},${totalY + 7} ${cgX - 7},${totalY}`}
              fill={CHART_COLORS.cgPoint}
            />
            <circle
              cx={cgX}
              cy={totalY}
              r={7}
              fill="rgba(0, 0, 0, 0.001)"
              pointerEvents="all"
              onMouseEnter={() => setIsCgHovered(true)}
              onMouseLeave={() => setIsCgHovered(false)}
              onFocus={() => setIsCgHovered(true)}
              onBlur={() => setIsCgHovered(false)}
              tabIndex={0}
            />
          </g>
          {isCgHovered && (
            <g pointerEvents="none">
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                rx={6}
                className='fill-popover stroke-border stroke-2'

              />
              <text
                x={tooltipX + 10}
                y={tooltipY + 18}
                className='fill-foreground text-xs font-normal font-sans antialiased select-none'

                
              >
                {tooltipLines.map((line, index) => (
                  <tspan key={line} x={tooltipX + 10} dy={index === 0 ? 0 : 16}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )}
          {isEnpHovered && (
            <g pointerEvents="none">
              <rect
                x={enpTooltipX}
                y={enpTooltipY}
                width={enpTooltipWidth}
                height={enpTooltipHeight}
                rx={6}

                className='fill-popover stroke-border stroke-2'
              />
              <text
                x={enpTooltipX + 10}
                y={enpTooltipY + 18}
                className='fill-foreground text-xs font-normal font-sans antialiased select-none'

              >
                {enpTooltipLines.map((line, index) => (
                  <tspan key={line} x={enpTooltipX + 10} dy={index === 0 ? 0 : 16}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )}

          <text
            x={cgX + 6}
            y={height - margin.bottom - 8}
            // fontSize={14}
            // fontWeight={700}
            // fill={CHART_COLORS.cgPoint}
            className='fill-green-400 text-sm font-bold font-sans antialiased select-none'

          >
            {centeringPercent.toFixed(1)}%
          </text>

          <text
            x={margin.left + plotWidth / 2}
            y={height - 10}
            textAnchor="middle"
            className='fill-foreground text-lg font-sans antialiased select-none'
          >
            Centrage (mm)
          </text>
          <text
            x={14}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            className='fill-foreground text-lg font-sans antialiased select-none'
            transform={`rotate(-90, 14, ${margin.top + plotHeight / 2})`}
          >
            Masse (kg)
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-6 text-xs text-slate-100/95">
        <div className="flex items-center gap-2">
          <span className="block h-0.5 w-9" style={{ backgroundColor: CHART_COLORS.envelope }} />
          <span>Limite de centrage</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="block h-3 w-3" style={{ backgroundColor: CHART_COLORS.enpPoint }} />
          <span>Masse ENP + occupants + gueuses et/ou water ballast</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="block h-3 w-3 rotate-45"
            style={{ backgroundColor: CHART_COLORS.cgPoint }}
          />
          <span>Centrage calculé</span>
        </div>
      </div>
    </div>
  )
}

export function HomePage() {
  const glidersQuery = useQuery({
    queryKey: ['gliders'],
    queryFn: () => backend.getGliders(),
  })
  const [selected, setSelected] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
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

  const gliderLimitsQuery = useQuery({
    queryKey: ['gliderLimits', selected],
    queryFn: () => backend.gliderLimits(selected),
    enabled: !!selected,
  })

  const calcMutation = useMutation({
    mutationFn: () => backend.calculateWeightBalance(selected, payload),
  })
  const mvenp = gliderLimitsQuery.data?.mvenp ?? 0
  const rearBallast = payload.rear_ballast_weight || 0
  const frontBallast = payload.front_ballast_weight || 0
  const pilots = (payload.front_pilot_weight || 0) + (payload.rear_pilot_weight || 0)
  const enpMass = mvenp + pilots + rearBallast + frontBallast
  const chartEnvelopePoints = useMemo<ChartPoint[]>(() => {
    if (!selectedGlider) return []

    const wbPoints = selectedGlider.weight_and_balances
      .map(([centering, mass]) => ({ x: centering, y: mass }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    if (wbPoints.length >= 2) return wbPoints

    const front = selectedGlider.limits.front_centering
    const rear = selectedGlider.limits.rear_centering
    const minMassCandidate = selectedGlider.limits.mmwv
    const maxMassCandidate = selectedGlider.limits.mmwp
    const minMass = Number.isFinite(minMassCandidate) && minMassCandidate > 0
      ? minMassCandidate
      : Math.max(0, enpMass - 40)
    const maxMass = Number.isFinite(maxMassCandidate) && maxMassCandidate > minMass
      ? maxMassCandidate
      : minMass + 80

    return [
      { x: front, y: minMass },
      { x: front, y: maxMass },
      { x: rear, y: maxMass },
      { x: rear, y: minMass },
    ]
  }, [selectedGlider, enpMass])

  useEffect(() => {
    calcMutation.reset()
  }, [selected])


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
      <Card>
        <CardHeader className="flex flex-wrap items-center gap-3">
          <CardTitle>Planeur</CardTitle>

          <Select value={selected} onValueChange={(v: string | null) => { if (v) setSelected(v) }} disabled={glidersQuery.isLoading}>
            <SelectTrigger className="bg-input/50 min-w-[15rem]">
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
              <Badge variant="secondary" className="text-xs">
                <Plane size={11} className="mr-1"/>
                {selectedGlider.brand}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Barcode size={11} className="mr-1"/>
                {selectedGlider.model}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedGlider.single_seat ?  <UserRound /> : <UsersRound /> }
                {selectedGlider.single_seat ? 'Monoplace' : 'Biplace'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGlider && (
        <>
          <Tabs defaultValue="centrage">
            <TabsList className="bg-muted/40 border border-border/40">
              <TabsTrigger value="centrage">Centrage</TabsTrigger>
              <TabsTrigger value="limites">Limites & Bras</TabsTrigger>
            </TabsList>

            <TabsContent value="centrage" className="space-y-5">
              {/* Weight inputs */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {PAYLOAD_SECTIONS.map(({ title, icon: Icon, fields }) => (
                  <Card key={title} className="border-border/60 bg-card/80">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon size={18} className="text-primary text-blue-600 dark:text-sky-400" />
                        {title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 pb-4">
                      {fields.map((key) => {
                        const isRearPilot = key === 'rear_pilot_weight';
                        const isFrontBallast = key === 'front_ballast_weight';
                        const isRearBallast = key === 'rear_ballast_weight';
                        const isWaterBallast = key === 'wing_water_ballast_weight';
                        const isPilot = key.includes('pilot');
                        const isMonoplane = selectedGlider?.single_seat;
                        const isFrontBallastArmZero = selectedGlider?.arms?.arm_front_ballast === 0;
                        const isRearBallastArmZero = selectedGlider?.arms?.arm_rear_watterballast_or_ballast === 0;
                        const isWaterBallastArmZero = selectedGlider?.arms?.arm_waterballast === 0;
                        const isDisabled = (isRearPilot && isMonoplane) || (isFrontBallast && isFrontBallastArmZero) || (isRearBallast && isRearBallastArmZero) || (isWaterBallast && isWaterBallastArmZero);
                        
                        const totalPilotWeight = (payload.front_pilot_weight || 0) + (payload.rear_pilot_weight || 0);
                        const harnessMax = selectedGlider?.limits?.mm_harnais ?? 0;
                        const showHarnessError = isPilot && focusedField === key && totalPilotWeight > harnessMax;
                        const canIncrement = !(isPilot && totalPilotWeight > harnessMax);
                        
                        return (
                          <div key={key} className="space-y-1.5">
                            <Label className={`text-xs ${isDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                              {PAYLOAD_LABELS[key] ?? key}
                            </Label>
                            <InputGroup>
                              <InputGroupInput
                                type="number"
                                min={0}
                                step={0.5}
                                value={payload[key as keyof typeof payload]}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setPayload((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))
                                }
                                onFocus={() => setFocusedField(key)}
                                onBlur={() => setFocusedField(null)}
                                placeholder="0"
                                disabled={isDisabled}
                                className={`font-mono text-center [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden [-moz-appearance:textfield] ${showHarnessError ? 'border-red-500 focus-visible:ring-red-500/50' : ''}`}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={isDisabled}
                                  onClick={() =>
                                    setPayload((prev) => ({
                                      ...prev,
                                      [key]: Math.max(0, prev[key as keyof typeof payload] - 0.5),
                                    }))
                                  }
                                >
                                  <Minus size={14} />
                                </InputGroupButton>
                                <InputGroupButton
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={isDisabled || !canIncrement}
                                  onClick={() =>
                                    setPayload((prev) => ({
                                      ...prev,
                                      [key]: prev[key as keyof typeof payload] + 0.5,
                                    }))
                                  }
                                >
                                  <Plus size={14} />
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                            {showHarnessError && (
                              <p className="text-xs text-red-500 font-medium">
                                Dépasse le poids max du harnais ({harnessMax} kg)
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                className="gap-2 w-full md:w-auto"
                onClick={() => calcMutation.mutate()}
                disabled={calcMutation.isPending}
              >
                <Calculator size={15} />
                {calcMutation.isPending ? 'Calcul…' : 'Calculer le centrage'}
              </Button>

              {/* Error */}
              {calcMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription>{apiError(calcMutation.error)}</AlertDescription>
                </Alert>
              )}

              {/* Result */}
              {calcMutation.data && (
                <>
                  <Card className="border-border/60 bg-card/80">
                    <CardHeader>
                      <CardTitle className="text-lg text-foreground">Résultats du calcul</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        {(() => {
                          const centragePassed = selectedGlider &&
                            calcMutation.data.center_of_gravity >= selectedGlider.limits.front_centering &&
                            calcMutation.data.center_of_gravity <= selectedGlider.limits.rear_centering
                          return (
                            <div className="space-y-2 sm:border-r sm:border-border/40 sm:pr-4 text-center">
                              <p className="text-xs text-muted-foreground">Centrage (mm)</p>
                              <p className={`font-mono text-2xl font-bold ${centragePassed ? 'text-green-500' : 'text-red-500'}`}>
                                {calcMutation.data.center_of_gravity.toFixed(1)} mm
                              </p>
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${centragePassed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                  {centragePassed ? (
                                    <span className="text-xs text-green-500">✓</span>
                                  ) : (
                                    <X size={14} className="text-red-500" />
                                  )}
                                </div>
                                <p className={`text-xs font-semibold ${centragePassed ? 'text-green-500' : 'text-red-500'}`}>
                                  {centragePassed ? 'Pass' : 'Failed'}
                                </p>
                              </div>
                              {selectedGlider && (
                                <p className="text-xs text-muted-foreground">
                                  (Limit: {selectedGlider.limits.front_centering}-{selectedGlider.limits.rear_centering} mm)
                                </p>
                              )}
                            </div>
                          )
                        })()}

                        <div className="space-y-2 sm:border-r sm:border-border/40 sm:pr-4 sm:pl-4 text-center">
                          {(() => {
                            const massePassed = selectedGlider && calcMutation.data.total_weight <= selectedGlider.limits.mmwp
                            return (
                              <>
                                <p className="text-xs text-muted-foreground">Masse totale (kg)</p>
                                <p className={`font-mono text-2xl font-bold ${massePassed ? 'text-green-500' : 'text-red-500'}`}>
                                  {calcMutation.data.total_weight.toFixed(1)} kg
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${massePassed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                    {massePassed ? (
                                      <span className="text-xs text-green-500">✓</span>
                                    ) : (
                                      <X size={14} className="text-red-500" />
                                    )}
                                  </div>
                                  <p className={`text-xs font-semibold ${massePassed ? 'text-green-500' : 'text-red-500'}`}>
                                    {massePassed ? 'Pass' : 'Failed'}
                                  </p>
                                </div>
                                {selectedGlider && (
                                  <p className="text-xs text-muted-foreground">
                                    (Max: {selectedGlider.limits.mmwp} kg)
                                  </p>
                                )}
                              </>
                            )
                          })()}
                        </div>

                        <div className="space-y-2 sm:pl-4 text-center">
                          {(() => {
                            const enpMassPassed = selectedGlider && enpMass <= selectedGlider.limits.mmenp
                            return (
                              <>
                                <p className="text-xs text-muted-foreground">Masse éléments non portants + occupants + gueuse & water ballast arrière</p>
                                <p className={`font-mono text-2xl font-bold ${enpMassPassed ? 'text-green-500' : 'text-red-500'}`}>
                                  {enpMass.toFixed(1)} kg
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${enpMassPassed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                    {enpMassPassed ? (
                                      <span className="text-xs text-green-500">✓</span>
                                    ) : (
                                      <X size={14} className="text-red-500" />
                                    )}
                                  </div>
                                  <p className={`text-xs font-semibold ${enpMassPassed ? 'text-green-500' : 'text-red-500'}`}>
                                    {enpMassPassed ? 'Pass' : 'Failed'}
                                  </p>
                                </div>
                                {selectedGlider && (
                                  <p className="text-xs text-muted-foreground">
                                    (Max: {selectedGlider.limits.mmenp} kg)
                                  </p>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                  <WeightBalanceGraph
                    envelopePoints={chartEnvelopePoints}
                    centerOfGravity={calcMutation.data.center_of_gravity}
                    totalWeight={calcMutation.data.total_weight}
                    enpMass={enpMass}
                    mmenp={selectedGlider.limits.mmenp}
                    frontCentering={selectedGlider.limits.front_centering}
                    rearCentering={selectedGlider.limits.rear_centering}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="limites">
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Limites de masse et bras de leviers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-4">
                      <section className="space-y-2">
                        <h3 className="text-lg text-foreground">Limitations de masse</h3>
                        <Card className="border-border/60 bg-card/80">
                          <CardContent className="space-y-4 px-4 py-4">
                            {MASS_LIMIT_FIELDS.map(({ key, label }) => (
                              <div key={key} className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{label}</Label>
                                <Input value={String(selectedGlider.limits[key] ?? '—')} readOnly className="bg-input/50 font-mono" />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </section>

                      <section className="space-y-2">
                        <h3 className="text-lg text-foreground">Limites de centrage</h3>
                        <Card className="border-border/60 bg-card/80">
                          <CardContent className="space-y-4 px-4 py-4">
                            {CENTERING_LIMIT_FIELDS.map(({ key, label }) => (
                              <div key={key} className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{label}</Label>
                                <Input value={String(selectedGlider.limits[key] ?? '—')} readOnly className="bg-input/50 font-mono" />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </section>
                    </div>

                    <section className="space-y-2">
                      <h3 className="text-lg text-foreground">Bras de leviers</h3>
                      <Card className="border-border/60 bg-card/80">
                        <CardContent className="space-y-4 px-4 py-4">
                          {ARM_FIELDS.map(({ key, label }) => (
                            <div key={key} className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">{label}</Label>
                              <Input value={String(selectedGlider.arms[key] ?? '—')} readOnly className="bg-input/50 font-mono" />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </section>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator className="my-2 bg-border/40" />
        </>
      )}
    </div>
  )
}
