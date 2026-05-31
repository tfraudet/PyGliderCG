import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { SortableTableHead } from '@/components/table/SortableTableHead'
import { TableStatusRow } from '@/components/table/TableStatusRow'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
	Select,
	SelectContent,
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
import { WeighingDetailCard } from '@/components/weighings/WeighingDetailCard'
import { WeighingPilotLimitsCards } from '@/components/weighings/WeighingPilotLimitsCards'
import type { Glider, GliderCalcLimits, Weighing } from '@/lib/types'
import { getLatestWeighing, getWeighingSelectionKey } from '@/lib/weighings'
import {
	formatWeighingOptionLabel,
	sortWeighings,
	WEIGHING_FIELDS,
	WEIGHING_FORM_LABELS,
} from './constants'
import type { SortDirection, WeighingSortKey } from './constants'

interface WeighingsHistorySectionProps {
	glider: Glider
	limitsData: GliderCalcLimits | null | undefined
	selectedRegistration: string
	selectedWeighingIds: Set<number>
	isDeleting: boolean
	onSelectedWeighingIdsChange: (value: Set<number>) => void
	onCreate: () => void
	onEdit: (weighing: Weighing) => void
	onDeleteSelection: (weighingIds: number[]) => void
	onDeleteOne: (weighingId: number) => void
	onSelectedDetailWeighingChange?: (weighing: Weighing | null) => void
}

export function WeighingsHistorySection({
	glider,
	limitsData,
	selectedRegistration,
	selectedWeighingIds,
	isDeleting,
	onSelectedWeighingIdsChange,
	onCreate,
	onEdit,
	onDeleteSelection,
	onDeleteOne,
	onSelectedDetailWeighingChange,
}: WeighingsHistorySectionProps) {
	const [sortKey, setSortKey] = useState<WeighingSortKey>('date')
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
	const [selectedDetailKey, setSelectedDetailKey] = useState('')

	const sortedWeighings = useMemo(
		() => sortWeighings(glider.weighings, sortKey, sortDirection),
		[glider.weighings, sortDirection, sortKey],
	)
	const selectableWeighingIds = useMemo(
		() => new Set(glider.weighings.flatMap((weighing) => weighing.id != null ? [weighing.id] : [])),
		[glider.weighings],
	)
	const effectiveSelectedIds = useMemo(
		() => new Set([...selectedWeighingIds].filter((id) => selectableWeighingIds.has(id))),
		[selectedWeighingIds, selectableWeighingIds],
	)
	const latestWeighing = useMemo(
		() => getLatestWeighing(glider.weighings),
		[glider.weighings],
	)
	const selectedDetailWeighing = useMemo(() => (
		glider.weighings.find((weighing) => getWeighingSelectionKey(selectedRegistration, weighing) === selectedDetailKey)
		?? latestWeighing
	), [glider.weighings, latestWeighing, selectedDetailKey, selectedRegistration])
	const selectedDetailLabel = useMemo(() => {
		if (selectedDetailWeighing == null) {
			return null
		}

		const selectedIndex = sortedWeighings.findIndex(
			({ weighing }) => getWeighingSelectionKey(selectedRegistration, weighing) === getWeighingSelectionKey(selectedRegistration, selectedDetailWeighing),
		)

		return selectedIndex >= 0 ? formatWeighingOptionLabel(selectedDetailWeighing, selectedIndex) : null
	}, [selectedDetailWeighing, selectedRegistration, sortedWeighings])
	const selectedDetailIsLatest = selectedDetailWeighing != null
		&& latestWeighing != null
		&& getWeighingSelectionKey(selectedRegistration, selectedDetailWeighing) === getWeighingSelectionKey(selectedRegistration, latestWeighing)

	useEffect(() => {
		onSelectedDetailWeighingChange?.(selectedDetailWeighing ?? null)
	}, [onSelectedDetailWeighingChange, selectedDetailWeighing])

	const handleSort = (nextKey: WeighingSortKey) => {
		if (sortKey === nextKey) {
			setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'))
			return
		}

		setSortKey(nextKey)
		setSortDirection(nextKey === 'date' ? 'desc' : 'asc')
	}

	const toggleSelection = (weighingId: number, checked: boolean | 'indeterminate') => {
		const next = new Set(selectedWeighingIds)
		if (checked === true) {
			next.add(weighingId)
		} else {
			next.delete(weighingId)
		}
		onSelectedWeighingIdsChange(next)
	}

	const toggleAllSelection = (checked: boolean | 'indeterminate') => {
		if (checked === true) {
			onSelectedWeighingIdsChange(new Set(selectableWeighingIds))
			return
		}

		onSelectedWeighingIdsChange(new Set())
	}

	const selectedCount = effectiveSelectedIds.size
	const allSelected = selectableWeighingIds.size > 0 && selectedCount === selectableWeighingIds.size

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="space-y-1 mt-10">
					<h2 className="text-xl font-semibold tracking-wider text-muted-foreground">Liste des pesées pour ce planeur</h2>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<Button variant="outline" onClick={onCreate}>
						<Plus data-icon="inline-start" />
						Ajouter une pesée
					</Button>
					<Button
						variant="destructive"
						onClick={() => onDeleteSelection([...effectiveSelectedIds])}
						disabled={selectedCount === 0 || isDeleting}
					>
						<Trash2 data-icon="inline-start" />
						{`Supprimer la selection (${selectedCount})`}
					</Button>
				</div>
			</div>

			<div className="overflow-x-auto rounded-lg border border-border/80">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-12">
								<Checkbox
									checked={allSelected}
									onCheckedChange={toggleAllSelection}
									aria-label="Sélectionner toutes les pesées"
								/>
							</TableHead>
							{WEIGHING_FIELDS.map((field) => (
								<SortableTableHead
									key={field}
									label={WEIGHING_FORM_LABELS[field]}
									sortKey={field}
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={handleSort}
								/>
							))}
							<TableHead className="w-14 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{glider.weighings.length === 0 ? (
							<TableStatusRow colSpan={WEIGHING_FIELDS.length + 2} className="py-8 text-sm">
								Aucune pesée enregistrée.
							</TableStatusRow>
						) : (
							sortedWeighings.map(({ weighing, index }) => {
								const weighingId = weighing.id
								const rowKey = weighingId ?? `${weighing.date}-${index}`

								return (
									<TableRow key={rowKey}>
										<TableCell>
											<Checkbox
												checked={weighingId != null ? effectiveSelectedIds.has(weighingId) : false}
												disabled={weighingId == null || isDeleting}
												onCheckedChange={(checked) => {
													if (weighingId != null) {
														toggleSelection(weighingId, checked)
													}
												}}
												aria-label={`Sélectionner la pesée du ${weighing.date}`}
											/>
										</TableCell>
										<TableCell className="font-medium">{weighing.date}</TableCell>
										<TableCell className="text-muted-foreground">{weighing.p1}</TableCell>
										<TableCell className="text-muted-foreground">{weighing.p2}</TableCell>
										<TableCell className="text-muted-foreground">{weighing.A}</TableCell>
										<TableCell className="text-muted-foreground">{weighing.D}</TableCell>
										<TableCell className="text-muted-foreground">{weighing.right_wing_weight}</TableCell>
										<TableCell className="text-muted-foreground">{weighing.left_wing_weight}</TableCell>
										<TableCell className="text-muted-foreground">{weighing.tail_weight}</TableCell>
										<TableCell className="text-muted-foreground">{weighing.fuselage_weight}</TableCell>
										<TableCell className="text-muted-foreground">{weighing.fix_ballast_weight}</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger
													render={(
														<Button
															variant="ghost"
															size="icon-sm"
															aria-label={`Actions pour la pesée du ${weighing.date}`}
														/>
													)}
												>
													<MoreHorizontal />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-40">
													<DropdownMenuGroup>
														<DropdownMenuItem
															disabled={weighingId == null}
															onClick={() => onEdit(weighing)}
														>
															<Pencil />
															Modifier
														</DropdownMenuItem>
														<DropdownMenuItem
															variant="destructive"
															disabled={weighingId == null}
															onClick={() => {
																if (weighingId != null) {
																	onDeleteOne(weighingId)
																}
															}}
														>
															<Trash2 />
															Supprimer
														</DropdownMenuItem>
													</DropdownMenuGroup>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								)
							})
						)}
					</TableBody>
				</Table>
			</div>

			{selectedDetailWeighing != null && (
				<div className="space-y-5 mt-10">
					<Separator className="bg-border/80" />

					<div className="space-y-2">
						<Label className="text-sm text-muted-foreground">Sélectionner une pesée</Label>
						<Select
							value={getWeighingSelectionKey(selectedRegistration, selectedDetailWeighing)}
							onValueChange={(value: string | null) => {
								setSelectedDetailKey(value ?? '')
							}}
						>
							<SelectTrigger className="bg-input/50 w-full max-w-3xs">
								<SelectValue placeholder="Sélectionner une pesée…">
									{selectedDetailLabel ?? undefined}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{sortedWeighings.map(({ weighing, index }) => {
									const weighingKey = getWeighingSelectionKey(selectedRegistration, weighing)

									return (
										<SelectItem key={weighingKey} value={weighingKey}>
											{formatWeighingOptionLabel(weighing, index)}
										</SelectItem>
									)
								})}
							</SelectContent>
						</Select>
					</div>

					<WeighingDetailCard
						weighing={selectedDetailWeighing}
						displayLabel={selectedDetailLabel ?? undefined}
						limitsData={selectedDetailIsLatest ? limitsData : null}
						showSummary={selectedDetailIsLatest}
					/>

					{selectedDetailIsLatest && limitsData != null && (
						<WeighingPilotLimitsCards
							glider={glider}
							limitsData={limitsData}
						/>
					)}
				</div>
			)}
		</div>
	)
}
