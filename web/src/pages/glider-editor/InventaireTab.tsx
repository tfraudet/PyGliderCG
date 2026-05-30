import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown, MoreHorizontal, PackageCheck, PackageX, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { TabsContent } from '@/components/ui/tabs'
import type { Instrument } from '@/lib/types'
import { EMPTY_INSTRUMENT, INSTRUMENT_LOCATION_OPTIONS } from './constants'
import { DateInputPicker } from './DateInputPicker'
import type { UpdateInstruments } from './types'
import {
	applyDateMask,
	formatDateForStorage,
	formatDateInput,
	isChecked,
	parseDateInput,
	parseStoredDate,
} from './utils'

type DialogMode = 'create' | 'edit' | null
type SortKey = 'on_board' | 'instrument' | 'brand' | 'type' | 'number' | 'date' | 'seat'
type SortDirection = 'asc' | 'desc'
const EMPTY_LOCATION_VALUE = '__empty__'

interface InventaireTabProps {
	instruments: Instrument[]
	onChange: UpdateInstruments
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
	if (!active) return <ArrowUpDown data-icon="inline-end" />
	return direction === 'asc' ? <ArrowUpAZ data-icon="inline-end" /> : <ArrowDownAZ data-icon="inline-end" />
}

function SortableHeader({
	label,
	sortKey,
	activeSortKey,
	sortDirection,
	onSort,
}: {
	label: string
	sortKey: SortKey
	activeSortKey: SortKey
	sortDirection: SortDirection
	onSort: (nextKey: SortKey) => void
}) {
	return (
		<TableHead>
			<Button
				variant="ghost"
				size="sm"
				className="-ml-2 h-8 px-2"
				onClick={() => onSort(sortKey)}
			>
				{label}
				<SortIcon active={activeSortKey === sortKey} direction={sortDirection} />
			</Button>
		</TableHead>
	)
}

export function InventaireTab({
	instruments,
	onChange,
}: InventaireTabProps) {
	const [dialogMode, setDialogMode] = useState<DialogMode>(null)
	const [activeIndex, setActiveIndex] = useState<number | null>(null)
	const [draft, setDraft] = useState<Instrument>({ ...EMPTY_INSTRUMENT })
	const [draftDateInput, setDraftDateInput] = useState('')
	const [sortKey, setSortKey] = useState<SortKey>('instrument')
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
	const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set())

	const activeTitle = useMemo(() => {
		if (dialogMode === 'create') {
			return 'Nouvel instrument'
		}

		if (draft.instrument) {
			return `Modifier ${draft.instrument}`
		}

		return 'Modifier instrument'
	}, [dialogMode, draft.instrument])

	const openCreateDialog = () => {
		setDialogMode('create')
		setActiveIndex(null)
		setDraft({ ...EMPTY_INSTRUMENT })
		setDraftDateInput('')
	}

	const openEditDialog = (instrument: Instrument, index: number) => {
		setDialogMode('edit')
		setActiveIndex(index)
		setDraft({ ...instrument })
		setDraftDateInput(formatDateInput(instrument.date))
	}

	const closeDialog = () => {
		setDialogMode(null)
		setActiveIndex(null)
		setDraft({ ...EMPTY_INSTRUMENT })
		setDraftDateInput('')
	}

	const saveDraft = () => {
		if (draftDateInput.length > 0 && !parseDateInput(draftDateInput)) {
			return
		}

		if (dialogMode === 'create') {
			onChange((current) => [...current, { ...draft }])
		} else if (activeIndex !== null) {
			onChange((current) => current.map((item, itemIndex) => itemIndex === activeIndex ? { ...draft } : item))
		}

		closeDialog()
	}

	const deleteInstrument = (index: number) => {
		onChange((current) => current.filter((_, itemIndex) => itemIndex !== index))
	}

	const deleteSelection = () => {
		if (selectedIndexes.size === 0) {
			return
		}

		onChange((current) => current.filter((_, itemIndex) => !selectedIndexes.has(itemIndex)))
		setSelectedIndexes(new Set())
	}

	const sortedInstruments = useMemo(
		() => instruments
			.map((instrument, index) => ({ instrument, index }))
			.sort((left, right) => {
				const result = sortKey === 'on_board'
					? Number(left.instrument.on_board) - Number(right.instrument.on_board)
					: (left.instrument[sortKey] ?? '').toString()
						.localeCompare((right.instrument[sortKey] ?? '').toString(), 'fr', { sensitivity: 'base' })

				if (result !== 0) {
					return sortDirection === 'asc' ? result : -result
				}

				const leftLabel = left.instrument.instrument || ''
				const rightLabel = right.instrument.instrument || ''
				const fallback = leftLabel.localeCompare(rightLabel, 'fr', { sensitivity: 'base' })
				if (fallback !== 0) {
					return fallback
				}

				return left.index - right.index
			}),
		[instruments, sortDirection, sortKey],
	)

	const handleSort = (nextKey: SortKey) => {
		if (sortKey === nextKey) {
			setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'))
			return
		}

		setSortKey(nextKey)
		setSortDirection('asc')
	}

	const selectedCount = selectedIndexes.size
	const allSelected = instruments.length > 0 && selectedCount === instruments.length
	const draftDateInvalid = draftDateInput.length > 0 && !parseDateInput(draftDateInput)
	const selectedDraftDate = useMemo(() => parseStoredDate(draft.date), [draft.date])

	const toggleSelection = (index: number, checked: boolean | 'indeterminate') => {
		setSelectedIndexes((current) => {
			const next = new Set(current)
			if (checked === true) {
				next.add(index)
			} else {
				next.delete(index)
			}
			return next
		})
	}

	const toggleAllSelection = (checked: boolean | 'indeterminate') => {
		if (checked === true) {
			setSelectedIndexes(new Set(instruments.map((_, index) => index)))
			return
		}

		setSelectedIndexes(new Set())
	}

	useEffect(() => {
		setSelectedIndexes(new Set())
	}, [instruments])

	return (
		<TabsContent value="inventaire" className="space-y-5">
			<div className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center justify-end gap-2">
					<div className="flex flex-wrap items-center justify-end gap-2">
						<Button variant="outline" onClick={openCreateDialog}>
							<Plus data-icon="inline-start" />
							Ajouter un instrument
						</Button>
						<Button
							variant="destructive"
							onClick={deleteSelection}
							disabled={selectedCount === 0}
						>
							<Trash2 data-icon="inline-start" />
							{`Supprimer la selection (${selectedCount})`}
						</Button>
					</div>
				</div>

				<div className="rounded-lg border border-border/80">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-12">
									<Checkbox
										checked={allSelected}
										onCheckedChange={toggleAllSelection}
										aria-label="Sélectionner tous les instruments"
									/>
								</TableHead>
								<SortableHeader
									label="Installé"
									sortKey="on_board"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={handleSort}
								/>
								<SortableHeader
									label="Instrument"
									sortKey="instrument"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={handleSort}
								/>
								<SortableHeader
									label="Marque"
									sortKey="brand"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={handleSort}
								/>
								<SortableHeader
									label="Type"
									sortKey="type"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={handleSort}
								/>
								<SortableHeader
									label="Numero"
									sortKey="number"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={handleSort}
								/>
								<SortableHeader
									label="Date"
									sortKey="date"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={handleSort}
								/>
								<SortableHeader
									label="Où"
									sortKey="seat"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={handleSort}
								/>
								<TableHead className="w-14 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{instruments.length === 0 ? (
								<TableRow>
									<TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
										Aucun instrument.
									</TableCell>
								</TableRow>
							) : (
								sortedInstruments.map(({ instrument, index }) => (
									<TableRow key={`${instrument.id ?? 'new'}-${index}`}>
										<TableCell>
											<Checkbox
												checked={selectedIndexes.has(index)}
												onCheckedChange={(checked) => toggleSelection(index, checked)}
												aria-label={`Sélectionner ${instrument.instrument || 'cet instrument'}`}
											/>
										</TableCell>
										<TableCell>
											<span
												className="flex items-center justify-center"
												aria-label={`Instrument ${instrument.instrument || 'sans nom'} ${instrument.on_board ? 'installé' : 'non installé'}`}
												title={instrument.on_board ? 'Installé' : 'Non installé'}
											>
												{instrument.on_board ? (
													<PackageCheck size={18} className="text-emerald-600" />
												) : (
													<PackageX size={18} className="text-destructive" />
												)}
											</span>
										</TableCell>
										<TableCell className="font-medium">{instrument.instrument || '—'}</TableCell>
										<TableCell className="text-muted-foreground">{instrument.brand || '—'}</TableCell>
										<TableCell className="text-muted-foreground">{instrument.type || '—'}</TableCell>
										<TableCell className="text-muted-foreground">{instrument.number || '—'}</TableCell>
										<TableCell className="text-muted-foreground">{instrument.date || '—'}</TableCell>
										<TableCell>
											<Badge variant={instrument.seat ? 'secondary' : 'outline'}>
												{instrument.seat || '—'}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger
													render={(
														<Button
															variant="ghost"
															size="icon-sm"
															aria-label={`Actions pour ${instrument.instrument || 'cet instrument'}`}
														/>
													)}
												>
													<MoreHorizontal />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-40">
													<DropdownMenuGroup>
														<DropdownMenuItem onClick={() => openEditDialog(instrument, index)}>
															<Pencil />
															Modifier
														</DropdownMenuItem>
														<DropdownMenuItem
															variant="destructive"
															onClick={() => deleteInstrument(index)}
														>
															<Trash2 />
															Supprimer
														</DropdownMenuItem>
													</DropdownMenuGroup>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

			</div>

			<Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog() }}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{activeTitle}</DialogTitle>
						<DialogDescription>
							{dialogMode === 'create'
								? 'Ajouter un instrument à l’inventaire.'
								: 'Modifier l’instrument sélectionné.'}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground">Instrument</Label>
							<Input
								value={draft.instrument}
								onChange={(event) => setDraft((current) => ({ ...current, instrument: event.target.value }))}
								className="bg-input/50"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground">Marque</Label>
							<Input
								value={draft.brand}
								onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))}
								className="bg-input/50"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground">Type</Label>
							<Input
								value={draft.type}
								onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
								className="bg-input/50"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground">Numero</Label>
							<Input
								value={draft.number}
								onChange={(event) => setDraft((current) => ({ ...current, number: event.target.value }))}
								className="bg-input/50"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground">Date</Label>
							<DateInputPicker
								value={draftDateInput}
								selectedDate={selectedDraftDate}
								isInvalid={draftDateInvalid}
								onInputChange={(value) => {
									const maskedValue = applyDateMask(value)
									setDraftDateInput(maskedValue)
									setDraft((current) => ({
										...current,
										date: parseDateInput(maskedValue),
									}))
								}}
								onSelectDate={(date) => {
									const nextValue = date ? formatDateForStorage(date) : null
									setDraftDateInput(formatDateInput(nextValue))
									setDraft((current) => ({
										...current,
										date: nextValue,
									}))
								}}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground">Où</Label>
							<Select
								value={draft.seat || EMPTY_LOCATION_VALUE}
								onValueChange={(value: string | null) => {
									if (value == null) {
										return
									}

									setDraft((current) => ({
										...current,
										seat: value === EMPTY_LOCATION_VALUE ? '' : value,
									}))
								}}
							>
								<SelectTrigger className="w-full bg-input/50">
									<SelectValue>
										{INSTRUMENT_LOCATION_OPTIONS.find((option) => option.value === draft.seat)?.label ?? 'Non renseigné'}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{INSTRUMENT_LOCATION_OPTIONS.map((option) => (
											<SelectItem
												key={option.label}
												value={option.value || EMPTY_LOCATION_VALUE}
											>
												{option.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-2 pt-6">
							<Checkbox
								checked={draft.on_board}
								onCheckedChange={(checked) => setDraft((current) => ({ ...current, on_board: isChecked(checked) }))}
								aria-label="Instrument installé"
							/>
							<Label>Installé</Label>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={closeDialog}>
							Annuler
						</Button>
						<Button onClick={saveDraft} disabled={draftDateInvalid}>
							{dialogMode === 'create' ? 'Ajouter' : 'Enregistrer'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</TabsContent>
	)
}
