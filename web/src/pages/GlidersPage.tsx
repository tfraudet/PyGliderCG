import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Pencil, PlaneTakeoff, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { QueryErrorAlert } from '@/components/QueryErrorAlert'
import { PageNavigation } from '@/components/table/PageNavigation'
import { SortableTableHead } from '@/components/table/SortableTableHead'
import { TableStatusRow } from '@/components/table/TableStatusRow'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { backend } from '@/lib/api'
import { invalidateGliderQueries, useGliders } from '@/hooks/use-app-queries'
import { getPageTokens } from '@/lib/pagination'

const PAGE_SIZE = 10

type SortKey = 'registration' | 'model' | 'brand' | 'serial_number' | 'single_seat'
type SortDirection = 'asc' | 'desc'

function isChecked(value: boolean | 'indeterminate') {
	return value === true
}

export function GlidersPage() {
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([])
	const [currentPage, setCurrentPage] = useState(1)
	const [sortKey, setSortKey] = useState<SortKey>('registration')
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

	const glidersQuery = useGliders()

	const deleteMutation = useMutation({
		mutationFn: async (registrations: string[]) => Promise.all(registrations.map((registration) => backend.deleteGlider(registration))),
		onSuccess: async (_, registrations) => {
			await invalidateGliderQueries(queryClient, registrations)
			setSelectedRegistrations((previous) => previous.filter((registration) => !registrations.includes(registration)))
		},
	})

	const sortedGliders = useMemo(
		() => [...(glidersQuery.data ?? [])].sort((left, right) => {
			if (sortKey === 'single_seat') {
				if (left.single_seat !== right.single_seat) {
					return sortDirection === 'asc'
						? Number(left.single_seat) - Number(right.single_seat)
						: Number(right.single_seat) - Number(left.single_seat)
				}
			} else {
				const leftValue = String(left[sortKey] ?? '')
				const rightValue = String(right[sortKey] ?? '')
				const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' })
				if (comparison !== 0) {
					return sortDirection === 'asc' ? comparison : -comparison
				}
			}

			return left.registration.localeCompare(right.registration, undefined, { numeric: true, sensitivity: 'base' })
		}),
		[glidersQuery.data, sortDirection, sortKey],
	)
	const availableRegistrations = useMemo(
		() => new Set(sortedGliders.map((glider) => glider.registration)),
		[sortedGliders],
	)
	const effectiveSelectedRegistrations = useMemo(
		() => selectedRegistrations.filter((registration) => availableRegistrations.has(registration)),
		[selectedRegistrations, availableRegistrations],
	)
	const allSelected = sortedGliders.length > 0 && effectiveSelectedRegistrations.length === sortedGliders.length
	const pageCount = Math.max(1, Math.ceil(sortedGliders.length / PAGE_SIZE))
	const effectiveCurrentPage = Math.min(currentPage, pageCount)
	const currentPageGliders = useMemo(() => {
		const startIndex = (effectiveCurrentPage - 1) * PAGE_SIZE
		return sortedGliders.slice(startIndex, startIndex + PAGE_SIZE)
	}, [effectiveCurrentPage, sortedGliders])
	const pageTokens = useMemo(
		() => getPageTokens(pageCount, effectiveCurrentPage, { edgeWindow: 4 }),
		[effectiveCurrentPage, pageCount],
	)
	const visibleStart = sortedGliders.length === 0 ? 0 : (effectiveCurrentPage - 1) * PAGE_SIZE + 1
	const visibleEnd = sortedGliders.length === 0 ? 0 : Math.min(effectiveCurrentPage * PAGE_SIZE, sortedGliders.length)

	function toggleSort(nextKey: SortKey) {
		setCurrentPage(1)
		if (sortKey === nextKey) {
			setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
			return
		}

		setSortKey(nextKey)
		setSortDirection('asc')
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-3">
				<PlaneTakeoff className="text-primary" />
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Gestion des planeurs</h1>
					<p className="text-muted-foreground">Affichez, modifiez et supprimez les planeurs enregistres.</p>
				</div>
			</div>

			<QueryErrorAlert error={glidersQuery.error} />
			<QueryErrorAlert error={deleteMutation.error} />

			<div className="flex flex-wrap items-center justify-end gap-2">
				<Button
					variant="destructive"
					onClick={() => deleteMutation.mutate(effectiveSelectedRegistrations)}
					disabled={deleteMutation.isPending || effectiveSelectedRegistrations.length === 0}
				>
					<Trash2 data-icon="inline-start" />
					{effectiveSelectedRegistrations.length > 0
						? `Supprimer la sélection (${effectiveSelectedRegistrations.length})`
						: 'Supprimer la sélection'}
				</Button>
				<Button onClick={() => navigate('/gliders/new')}>
					<Plus data-icon="inline-start" />
					Ajouter un planeur
				</Button>
			</div>

			<div className="overflow-hidden rounded-lg border border-border/60">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">
									<Checkbox
										checked={allSelected}
										aria-label="Selectionner tous les planeurs"
										onCheckedChange={(checked) => {
											setSelectedRegistrations(isChecked(checked) ? sortedGliders.map((item) => item.registration) : [])
										}}
									/>
								</TableHead>
								<SortableTableHead
									label="Immatriculation"
									sortKey="registration"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={toggleSort}
									buttonClassName="-ml-3 h-8 px-3"
								/>
								<SortableTableHead
									label="Modele"
									sortKey="model"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={toggleSort}
									buttonClassName="-ml-3 h-8 px-3"
								/>
								<SortableTableHead
									label="Marque"
									sortKey="brand"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={toggleSort}
									buttonClassName="-ml-3 h-8 px-3"
								/>
								<SortableTableHead
									label="Numero de serie"
									sortKey="serial_number"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={toggleSort}
									buttonClassName="-ml-3 h-8 px-3"
								/>
								<SortableTableHead
									label="Monoplace"
									sortKey="single_seat"
									activeSortKey={sortKey}
									sortDirection={sortDirection}
									onSort={toggleSort}
									buttonClassName="-ml-3 h-8 px-3"
								/>
								<TableHead className="w-16 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{glidersQuery.isLoading ? (
								<TableStatusRow colSpan={7}>
									Chargement...
								</TableStatusRow>
							) : currentPageGliders.length === 0 ? (
								<TableStatusRow colSpan={7}>
									Aucun planeur enregistre.
								</TableStatusRow>
							) : (
								currentPageGliders.map((glider) => (
									<TableRow key={glider.registration}>
										<TableCell>
											<Checkbox
												checked={effectiveSelectedRegistrations.includes(glider.registration)}
												aria-label={`Selectionner ${glider.registration}`}
												onCheckedChange={(checked) => {
													setSelectedRegistrations((previous) => (
														isChecked(checked)
															? Array.from(new Set([...previous, glider.registration]))
															: previous.filter((registration) => registration !== glider.registration)
													))
												}}
											/>
										</TableCell>
										<TableCell className="font-medium">{glider.registration}</TableCell>
										<TableCell>{glider.model || '—'}</TableCell>
										<TableCell>{glider.brand || '—'}</TableCell>
										<TableCell>{glider.serial_number ?? '—'}</TableCell>
										<TableCell>
											<Checkbox checked={glider.single_seat} disabled aria-label={`Monoplace ${glider.registration}`} />
										</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger
													render={(
														<Button variant="ghost" size="icon" aria-label={`Actions pour ${glider.registration}`} />
													)}
												>
													<MoreHorizontal />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={() => navigate(`/gliders/edit?registration=${encodeURIComponent(glider.registration)}`)}>
														<Pencil />
														Voir / modifier
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														variant="destructive"
														onClick={() => deleteMutation.mutate([glider.registration])}
													>
														<Trash2 />
														Supprimer
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				{sortedGliders.length > 0 && (
					<div className="flex flex-col gap-4 border-t border-border/40 px-4 py-4 md:flex-row md:items-center md:justify-between">
						<p className="text-sm text-muted-foreground">
							Affichage de {visibleStart} a {visibleEnd} sur {sortedGliders.length} planeur{sortedGliders.length > 1 ? 's' : ''}
						</p>

						<PageNavigation
							currentPage={effectiveCurrentPage}
							pageCount={pageCount}
							pageTokens={pageTokens}
							onPageChange={setCurrentPage}
						/>
					</div>
				)}
			</div>
		</div>
	)
}
