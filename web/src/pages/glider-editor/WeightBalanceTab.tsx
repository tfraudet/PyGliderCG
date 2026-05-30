import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown, MoreHorizontal, Pencil, Plus, RulerDimensionLine, Trash2, Weight } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { TabsContent } from '@/components/ui/tabs'
import { EMPTY_WEIGHT_BALANCE_POINT } from './constants'
import type { UpdateWeightBalances } from './types'

type DialogMode = 'create' | 'edit' | null
type SortKey = 'weight' | 'balance'
type SortDirection = 'asc' | 'desc'
type WeightBalancePoint = [number, number]
type WeightBalanceDraft = {
	weight: string
	balance: string
}

interface WeightBalanceTabProps {
	weightAndBalances: Array<[number, number]>
	onChange: UpdateWeightBalances
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
	label: ReactNode
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

function pointToDraft([weight, balance]: WeightBalancePoint): WeightBalanceDraft {
	return {
		weight: String(weight),
		balance: String(balance),
	}
}

function draftToPoint(draft: WeightBalanceDraft): WeightBalancePoint {
	return [Number(draft.weight), Number(draft.balance)]
}

function isDraftValid(draft: WeightBalanceDraft) {
	return draft.weight.trim().length > 0
		&& draft.balance.trim().length > 0
		&& Number.isFinite(Number(draft.weight))
		&& Number.isFinite(Number(draft.balance))
}

export function WeightBalanceTab({
	weightAndBalances,
	onChange,
}: WeightBalanceTabProps) {
	const [dialogMode, setDialogMode] = useState<DialogMode>(null)
	const [activeIndex, setActiveIndex] = useState<number | null>(null)
	const [draft, setDraft] = useState<WeightBalanceDraft>(pointToDraft(EMPTY_WEIGHT_BALANCE_POINT))
	const [sortKey, setSortKey] = useState<SortKey>('weight')
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
	const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set())

	const activeTitle = useMemo(() => {
		if (dialogMode === 'create') {
			return 'Nouveau point'
		}

		return 'Modifier le point'
	}, [dialogMode])

	const openCreateDialog = () => {
		setDialogMode('create')
		setActiveIndex(null)
		setDraft(pointToDraft(EMPTY_WEIGHT_BALANCE_POINT))
	}

	const openEditDialog = (point: WeightBalancePoint, index: number) => {
		setDialogMode('edit')
		setActiveIndex(index)
		setDraft(pointToDraft(point))
	}

	const closeDialog = () => {
		setDialogMode(null)
		setActiveIndex(null)
		setDraft(pointToDraft(EMPTY_WEIGHT_BALANCE_POINT))
	}

	const saveDraft = () => {
		if (!isDraftValid(draft)) {
			return
		}

		const nextPoint = draftToPoint(draft)
		if (dialogMode === 'create') {
			onChange((current) => [...current, nextPoint])
		} else if (activeIndex !== null) {
			onChange((current) => current.map((item, itemIndex) => itemIndex === activeIndex ? nextPoint : item))
		}

		closeDialog()
	}

	const deletePoint = (index: number) => {
		onChange((current) => current.filter((_, itemIndex) => itemIndex !== index))
	}

	const deleteSelection = () => {
		if (selectedIndexes.size === 0) {
			return
		}

		onChange((current) => current.filter((_, itemIndex) => !selectedIndexes.has(itemIndex)))
		setSelectedIndexes(new Set())
	}

	const sortedPoints = useMemo(
		() => weightAndBalances
			.map((point, index) => ({ point, index }))
			.sort((left, right) => {
				const leftValue = sortKey === 'weight' ? left.point[0] : left.point[1]
				const rightValue = sortKey === 'weight' ? right.point[0] : right.point[1]
				const result = leftValue - rightValue

				if (result !== 0) {
					return sortDirection === 'asc' ? result : -result
				}

				const fallback = left.point[0] - right.point[0]
				if (fallback !== 0) {
					return fallback
				}

				return left.index - right.index
			}),
		[sortDirection, sortKey, weightAndBalances],
	)

	const handleSort = (nextKey: SortKey) => {
		if (sortKey === nextKey) {
			setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'))
			return
		}

		setSortKey(nextKey)
		setSortDirection('asc')
	}

	const effectiveSelectedIndexes = useMemo(
		() => new Set([...selectedIndexes].filter((index) => index >= 0 && index < weightAndBalances.length)),
		[selectedIndexes, weightAndBalances.length],
	)
	const selectedCount = effectiveSelectedIndexes.size
	const allSelected = weightAndBalances.length > 0 && selectedCount === weightAndBalances.length
	const draftValid = isDraftValid(draft)

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
			setSelectedIndexes(new Set(weightAndBalances.map((_, index) => index)))
			return
		}

		setSelectedIndexes(new Set())
	}

	return (
		<TabsContent value="wb" className="space-y-5">
			<div className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center justify-end gap-2">
					<div className="flex flex-wrap items-center justify-end gap-2">
						<Button variant="outline" onClick={openCreateDialog}>
							<Plus data-icon="inline-start" />
							Ajouter un point
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
										aria-label="Sélectionner tous les points de masse et centrage"
									/>
								</TableHead>
								<SortableHeader
									label={<><Weight data-icon="inline-start" />Masse (kg)</>}
									sortKey="weight"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={handleSort}
								/>
								<SortableHeader
									label={<><RulerDimensionLine data-icon="inline-start" />Centrage (mm)</>}
									sortKey="balance"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={handleSort}
								/>
								<TableHead className="w-14 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{weightAndBalances.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
										Aucun point.
									</TableCell>
								</TableRow>
							) : (
								sortedPoints.map(({ point, index }) => (
									<TableRow key={`${point[0]}-${point[1]}-${index}`}>
										<TableCell>
											<Checkbox
												checked={effectiveSelectedIndexes.has(index)}
												onCheckedChange={(checked) => toggleSelection(index, checked)}
												aria-label={`Sélectionner le point ${point[0]} kilogrammes / ${point[1]} millimètres`}
											/>
										</TableCell>
										<TableCell className="font-medium">{point[0]}</TableCell>
										<TableCell className="text-muted-foreground">{point[1]}</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger
													render={(
														<Button
															variant="ghost"
															size="icon-sm"
															aria-label={`Actions pour le point ${point[0]} kilogrammes / ${point[1]} millimètres`}
														/>
													)}
												>
													<MoreHorizontal />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-40">
													<DropdownMenuGroup>
														<DropdownMenuItem onClick={() => openEditDialog(point, index)}>
															<Pencil />
															Modifier
														</DropdownMenuItem>
														<DropdownMenuItem
															variant="destructive"
															onClick={() => deletePoint(index)}
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
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{activeTitle}</DialogTitle>
						<DialogDescription>
							{dialogMode === 'create'
								? 'Ajouter un point de masse et centrage.'
								: 'Modifier le point sélectionné.'}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground">Masse (kg)</Label>
							<Input
								type="number"
								value={draft.weight}
								onChange={(event) => setDraft((current) => ({ ...current, weight: event.target.value }))}
								className="bg-input/50"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground">Centrage (mm)</Label>
							<Input
								type="number"
								value={draft.balance}
								onChange={(event) => setDraft((current) => ({ ...current, balance: event.target.value }))}
								className="bg-input/50"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={closeDialog}>
							Annuler
						</Button>
						<Button onClick={saveDraft} disabled={!draftValid}>
							{dialogMode === 'create' ? 'Ajouter' : 'Enregistrer'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</TabsContent>
	)
}
