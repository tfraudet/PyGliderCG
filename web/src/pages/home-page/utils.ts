import type { Glider } from '@/lib/types'
import type { ChartPoint, PayloadFieldState, PayloadKey, PayloadState, PilotLimitResult } from './types'

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const niceStep = (rawStep: number) => {
  const exponent = Math.floor(Math.log10(rawStep))
  const base = 10 ** exponent
  const normalized = rawStep / base
  if (normalized <= 1) return 1 * base
  if (normalized <= 2) return 2 * base
  if (normalized <= 5) return 5 * base
  return 10 * base
}

export function createAxisTicks(min: number, max: number, targetTickCount: number) {
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

export const formatTick = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

export const formatMetricValue = (value: number | null | undefined, decimals = 1) =>
  Number.isFinite(value) ? Number(value).toFixed(decimals) : '—'

export function formatDateLabel(value: string | null | undefined) {
  if (!value) return 'date inconnue'
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!isoMatch) return value

  const [, year, month, day] = isoMatch
  return `${day}/${month}/${year}`
}

export function getRetainedPilotMin(
  manualMin: number | null | undefined,
  calculatedMin: number | null | undefined,
): PilotLimitResult {
  const candidates = [manualMin, calculatedMin].filter((value): value is number => Number.isFinite(value))
  const value = candidates.length ? Math.max(...candidates) : null
  const reason = value == null
    ? null
    : manualMin != null && value === manualMin && (calculatedMin == null || manualMin >= calculatedMin)
      ? 'Manuel de vol'
      : 'Centrage'

  return { value, reason }
}

export function getRetainedPilotMax(
  calculatedMax: number | null | undefined,
  usefulLoadLimit: number | null | undefined,
  seatLimit: number | null | undefined,
): PilotLimitResult {
  const candidates = [
    calculatedMax != null ? { value: calculatedMax, reason: 'Centrage' } : null,
    usefulLoadLimit != null ? { value: usefulLoadLimit, reason: 'Limité par les éléments non portants' } : null,
    seatLimit != null ? { value: seatLimit, reason: 'Limité par les harnais' } : null,
  ].filter((candidate): candidate is { value: number; reason: string } => candidate !== null && Number.isFinite(candidate.value))

  const value = candidates.length ? Math.min(...candidates.map((candidate) => candidate.value)) : null
  const reason = value == null
    ? null
    : candidates.find((candidate) => candidate.value === value)?.reason ?? 'Limitation retenue'

  return { value, reason }
}

export function buildChartEnvelopePoints(glider: Glider | null, enpMass: number): ChartPoint[] {
  if (!glider) return []

  const wbPoints = glider.weight_and_balances
    .map(([centering, mass]) => ({ x: centering, y: mass }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  if (wbPoints.length >= 2) return wbPoints

  const front = glider.limits.front_centering
  const rear = glider.limits.rear_centering
  const minMassCandidate = glider.limits.mmwv
  const maxMassCandidate = glider.limits.mmwp
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
}

export function getPayloadFieldState(
  key: PayloadKey,
  glider: Glider | null,
  payload: PayloadState,
  focusedField: string | null,
): PayloadFieldState {
  const isRearPilot = key === 'rear_pilot_weight'
  const isFrontBallast = key === 'front_ballast_weight'
  const isRearBallast = key === 'rear_ballast_weight'
  const isWaterBallast = key === 'wing_water_ballast_weight'
  const isPilot = key.includes('pilot')
  const totalPilotWeight = payload.front_pilot_weight + payload.rear_pilot_weight
  const harnessMax = glider?.limits.mm_harnais ?? 0

  const isDisabled = (
    (isRearPilot && glider?.single_seat)
    || (isFrontBallast && glider?.arms.arm_front_ballast === 0)
    || (isRearBallast && glider?.arms.arm_rear_watterballast_or_ballast === 0)
    || (isWaterBallast && glider?.arms.arm_waterballast === 0)
  )

  return {
    isDisabled,
    showHarnessError: isPilot && focusedField === key && totalPilotWeight > harnessMax,
    canIncrement: !(isPilot && totalPilotWeight > harnessMax),
  }
}
