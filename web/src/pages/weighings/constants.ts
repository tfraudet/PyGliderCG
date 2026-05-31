import type { Weighing } from '@/lib/types'
import { formatDateLabel } from '@/lib/weighings'

export type WeighingField = Exclude<keyof Weighing, 'id'>
export type WeighingSortKey = WeighingField
export type SortDirection = 'asc' | 'desc'

export const WEIGHING_FIELDS: WeighingField[] = [
	'date',
	'p1',
	'p2',
	'A',
	'D',
	'right_wing_weight',
	'left_wing_weight',
	'tail_weight',
	'fuselage_weight',
	'fix_ballast_weight',
]

// These labels are specific to the edit/listing surfaces.
export const WEIGHING_FORM_LABELS: Record<WeighingField, string> = {
	date: 'Date',
	p1: 'P1 (kg)',
	p2: 'P2 (kg)',
	A: 'A (mm)',
	D: 'D (mm)',
	right_wing_weight: 'Aile droite (kg)',
	left_wing_weight: 'Aile gauche (kg)',
	tail_weight: 'Queue (kg)',
	fuselage_weight: 'Fuselage (kg)',
	fix_ballast_weight: 'Ballast fixe (kg)',
}

const DEFAULT_WEIGHING_DATE = new Date().toISOString().slice(0, 10)

export function createEmptyWeighing(): Weighing {
	return {
		date: DEFAULT_WEIGHING_DATE,
		p1: 0,
		p2: 0,
		A: 0,
		D: 0,
		right_wing_weight: 0,
		left_wing_weight: 0,
		tail_weight: 0,
		fuselage_weight: 0,
		fix_ballast_weight: 0,
	}
}

export function sortWeighings(
	weighings: Weighing[],
	sortKey: WeighingSortKey,
	sortDirection: SortDirection,
) {
	return weighings
		.map((weighing, index) => ({ weighing, index }))
		.sort((left, right) => {
			const leftValue = left.weighing[sortKey]
			const rightValue = right.weighing[sortKey]
			const result = sortKey === 'date'
				? String(leftValue).localeCompare(String(rightValue), 'fr', { sensitivity: 'base' })
				: Number(leftValue) - Number(rightValue)

			if (result !== 0) {
				return sortDirection === 'asc' ? result : -result
			}

			const fallback = left.weighing.date.localeCompare(right.weighing.date, 'fr', { sensitivity: 'base' })
			if (fallback !== 0) {
				return fallback
			}

			return left.index - right.index
		})
}

export function formatWeighingOptionLabel(weighing: Weighing, displayIndex: number) {
	return `pesée #${displayIndex + 1} du ${formatDateLabel(weighing.date)}`
}
