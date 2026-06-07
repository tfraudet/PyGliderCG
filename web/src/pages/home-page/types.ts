import type { GliderCalcLimits, Weighing } from '@/lib/types'

export type ChartPoint = { x: number; y: number }

export type PayloadKey =
  | 'front_pilot_weight'
  | 'rear_pilot_weight'
  | 'front_ballast_weight'
  | 'rear_ballast_weight'
  | 'wing_water_ballast_weight'

export type PayloadState = Record<PayloadKey, number>

export const EMPTY_PAYLOAD: PayloadState = {
  front_pilot_weight: 0,
  rear_pilot_weight: 0,
  front_ballast_weight: 0,
  rear_ballast_weight: 0,
  wing_water_ballast_weight: 0,
}

export type WeighingMetricKey = keyof Pick<
  Weighing,
  'p1' | 'p2' | 'A' | 'D' | 'right_wing_weight' | 'left_wing_weight' | 'tail_weight' | 'fuselage_weight' | 'fix_ballast_weight'
>

export type WeighingSummaryKey = keyof Pick<
  GliderCalcLimits,
  'mve' | 'mvenp' | 'cu' | 'cv_max' | 'cu_max' | 'empty_arm'
>

export interface PilotLimitResult {
  value: number | null
  reason: string | null
}

export interface PayloadFieldState {
  isDisabled: boolean
  showHarnessError: boolean
  canIncrement: boolean
}
