import type { Glider, Instrument } from '@/lib/types'

export type UpdateGliderDraft = (updater: (current: Glider) => Glider) => void
export type UpdateInstruments = (updater: (current: Instrument[]) => Instrument[]) => void
export type UpdateWeightBalances = (updater: (current: Array<[number, number]>) => Array<[number, number]>) => void
