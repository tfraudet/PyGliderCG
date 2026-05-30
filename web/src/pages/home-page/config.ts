import type { LucideIcon } from 'lucide-react'
import { Droplet, Users } from 'lucide-react'
import type { Arms, Limits } from '@/lib/types'
import type { PayloadKey, WeighingMetricKey, WeighingSummaryKey } from './types'

export const PAYLOAD_LABELS: Record<PayloadKey, string> = {
  front_pilot_weight: 'Masse pilote avant équipé (en kg)',
  rear_pilot_weight: 'Masse pilote arrière équipé (kg))',
  front_ballast_weight: 'Masse Gueuse avant (kg)',
  rear_ballast_weight: 'Masse Gueuse ou water ballast arrière (kg)',
  wing_water_ballast_weight: 'Masse d\'eau dans les ailes (kg)',
}

export const PAYLOAD_SECTIONS: Array<{ title: string; icon: LucideIcon; fields: PayloadKey[] }> = [
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

export const MASS_LIMIT_FIELDS: Array<{ key: keyof Limits; label: string }> = [
  { key: 'mmwp', label: 'MMWP (kg)' },
  { key: 'mmwv', label: 'MMWV (kg)' },
  { key: 'mmenp', label: 'MMENP (kg)' },
  { key: 'mm_harnais', label: 'MMHarnais (kg)' },
  { key: 'weight_min_pilot', label: 'Masse mini pilote (kg)' },
]

export const CENTERING_LIMIT_FIELDS: Array<{ key: keyof Limits; label: string }> = [
  { key: 'front_centering', label: 'Centrage avant (mm)' },
  { key: 'rear_centering', label: 'Centrage arrière (mm)' },
]

export const ARM_FIELDS: Array<{ key: keyof Arms; label: string }> = [
  { key: 'arm_front_pilot', label: 'Bras de levier pilote avant(mm)' },
  { key: 'arm_rear_pilot', label: 'Bras de levier pilote arrière (mm)' },
  { key: 'arm_waterballast', label: 'Bras de levier waterballast (mm)' },
  { key: 'arm_front_ballast', label: 'Bras de levier gueuse avant (mm)' },
  { key: 'arm_rear_watterballast_or_ballast', label: 'Bras de levier ballast ou gueuse arrière (mm)' },
  { key: 'arm_instruments_panel', label: 'Bras de levier tableau de bord (mm)' },
]

export const WEIGHING_FIELD_COLUMNS: Array<Array<{ key: WeighingMetricKey; label: string; decimals?: number }>> = [
  [
    { key: 'p1', label: 'P1 (kg)' },
    { key: 'p2', label: 'P2 (kg)' },
    { key: 'A', label: 'A (mm)', decimals: 0 },
    { key: 'D', label: 'D (mm)', decimals: 0 },
  ],
  [
    { key: 'right_wing_weight', label: 'Aile droite (kg)' },
    { key: 'left_wing_weight', label: 'Aile gauche (kg)' },
    { key: 'tail_weight', label: 'Empennage H (kg)' },
    { key: 'fuselage_weight', label: 'Fuselage (kg)' },
    { key: 'fix_ballast_weight', label: 'Masse du lest fixe (kg)' },
  ],
]

export const WEIGHING_SUMMARY_COLUMNS: Array<Array<{ key: WeighingSummaryKey; label: string }>> = [
  [
    { key: 'mve', label: 'Masse à vide équipée MVE (kg)' },
    { key: 'mvenp', label: 'Masse à vide des éléments non portants (MVENP) en kg' },
    { key: 'cu', label: 'Charge utile (kg)' },
  ],
  [
    { key: 'cv_max', label: 'Charge variable max (kg)' },
    { key: 'cu_max', label: 'Charge utile max (kg)' },
    { key: 'empty_arm', label: 'X0 (mm)' },
  ],
]
