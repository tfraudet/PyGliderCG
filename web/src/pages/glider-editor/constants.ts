import type { Arms, Glider, Limits } from '@/lib/types'

export const DATUM_OPTIONS = [
	{ value: 1, label: 'Bord d\'attaque de l\'aile - 2 point en arrière de la référence', image: '/img/datum-hd-1.png' },
	{ value: 2, label: 'Bord d\'attaque de l\'aile - 1 point en avant de la référence', image: '/img/datum-hd-2.png' },
	{ value: 3, label: 'Bord d\'attaque de l\'aile - Train principal en avant de la référence', image: '/img/datum-hd-4.png' },
	{ value: 4, label: 'Devant le planeur - 2 point en arrière de la référence', image: '/img/datum-hd-snc34c.png' },
] as const

export const PILOT_POSITION_OPTIONS = [
	{ value: 1, label: 'En avant de la référence' },
	{ value: 2, label: 'En arrière de la référence' },
] as const

export const MASS_LIMIT_FIELDS: Array<{ key: keyof Limits; label: string; step: number; tooltip: string }> = [
	{ key: 'mmwp', label: 'MMWP (kg)', step: 0.1, tooltip: 'Masse maximale ou masse maximale water ballast plein.' },
	{ key: 'mmwv', label: 'MMWV (kg)', step: 0.1, tooltip: 'Masse maximale water ballast vide ou masse maximale sans water ballast.' },
	{ key: 'mmenp', label: 'MMENP (kg)', step: 0.1, tooltip: 'Masse maximale des elements non portants.' },
	{ key: 'mm_harnais', label: 'MMHarnais (kg)', step: 0.1, tooltip: 'Masse maximale d utilisation du harnais.' },
	{ key: 'weight_min_pilot', label: 'Masse mini pilote (kg)', step: 0.1, tooltip: 'Masse minimum du pilote equipe.' },
]

export const CENTERING_LIMIT_FIELDS: Array<{ key: keyof Limits; label: string; step: number; tooltip: string }> = [
	{ key: 'front_centering', label: 'Centrage avant (mm)', step: 1, tooltip: 'Limite de centrage avant.' },
	{ key: 'rear_centering', label: 'Centrage arrière (mm)', step: 1, tooltip: 'Limite de centrage arriere.' },
]

export const ARM_FIELDS: Array<{ key: keyof Arms; label: string; step: number; tooltip: string }> = [
	{ key: 'arm_front_pilot', label: 'Bras de levier pilote avant(mm)', step: 1, tooltip: '' },
	{ key: 'arm_rear_pilot', label: 'Bras de levier pilote arrière (mm)', step: 1, tooltip: '' },
	{ key: 'arm_waterballast', label: 'Bras de levier waterballast (mm)', step: 1, tooltip: '' },
	{ key: 'arm_front_ballast', label: 'Bras de levier gueuse avant (mm)', step: 1, tooltip: '' },
	{ key: 'arm_rear_watterballast_or_ballast', label: 'Bras de levier ballast ou gueuse arrière (mm)', step: 1, tooltip: '' },
	{ key: 'arm_instruments_panel', label: 'Bras de levier tableau de bord (mm)', step: 1, tooltip: '' },
	{ key: 'arm_gas_tank', label: 'Bras de levier reservoir (mm)', step: 1, tooltip: '' },
]

export const EMPTY_INSTRUMENT: Glider['instruments'][number] = {
	on_board: false,
	instrument: '',
	brand: '',
	type: '',
	number: '',
	seat: '',
	date: null,
}

export const INSTRUMENT_LOCATION_OPTIONS = [
	{ value: '', label: 'Non renseigné' },
	{ value: 'AV', label: 'AV' },
	{ value: 'AR', label: 'AR' },
] as const

export const EMPTY_WEIGHT_BALANCE_POINT: Glider['weight_and_balances'][number] = [0, 0]

export const REGISTRATION_PATTERN = /^[A-Za-z0-9]-[A-Za-z0-9]{4}(?:\/[0-9]+m)?$/
