import type { Glider } from '@/lib/types'
import { DATUM_OPTIONS, REGISTRATION_PATTERN } from './constants'

export function cloneGlider(glider: Glider): Glider {
	return JSON.parse(JSON.stringify(glider)) as Glider
}

export function isChecked(value: boolean | 'indeterminate') {
	return value === true
}

export function getDatumOption(datum: number) {
	return DATUM_OPTIONS.find((option) => option.value === datum) ?? DATUM_OPTIONS[0]
}

export function getRegistrationError(registration: string, isCreateMode: boolean) {
	if (!isCreateMode) {
		return null
	}

	const trimmedRegistration = registration.trim()

	if (!trimmedRegistration) {
		return 'L\'immatriculation est obligatoire. Format attendu : x-xxxx ou x-xxxx/ddm (exemples : F-ABCD, F-ABCD/15m).'
	}

	if (!REGISTRATION_PATTERN.test(trimmedRegistration)) {
		return 'L\'immatriculation doit respecter le format attendu : x-xxxx ou x-xxxx/ddm (exemples : F-ABCD, F-ABCD/15m).'
	}

	return null
}

export function applyDateMask(value: string): string {
	const digits = value.replace(/\D/g, '').slice(0, 8)

	if (digits.length <= 2) return digits
	if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
	return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function parseDateInput(value: string): string | null {
	const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
	if (!match) return null

	const [, dayValue, monthValue, yearValue] = match
	const day = Number(dayValue)
	const month = Number(monthValue)
	const year = Number(yearValue)
	const date = new Date(year, month - 1, day)

	if (
		Number.isNaN(date.getTime()) ||
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null
	}

	return `${yearValue}-${monthValue}-${dayValue}`
}

export function formatDateInput(value: string | null | undefined): string {
	if (!value) return ''

	const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (isoMatch) {
		const [, year, month, day] = isoMatch
		return `${day}/${month}/${year}`
	}

	const frMatch = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)
	if (frMatch) {
		const [, day, month, year] = frMatch
		return `${day}/${month}/${year}`
	}

	return value
}

export function parseStoredDate(value: string | null | undefined): Date | undefined {
	if (!value) return undefined

	const normalized = parseDateInput(formatDateInput(value))
	if (!normalized) return undefined

	const [year, month, day] = normalized.split('-').map(Number)
	return new Date(year, month - 1, day)
}

export function formatDateForStorage(date: Date): string {
	const year = date.getFullYear().toString().padStart(4, '0')
	const month = (date.getMonth() + 1).toString().padStart(2, '0')
	const day = date.getDate().toString().padStart(2, '0')

	return `${year}-${month}-${day}`
}
