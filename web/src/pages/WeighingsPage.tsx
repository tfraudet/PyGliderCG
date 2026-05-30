import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Scale } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { apiError, backend } from '@/lib/api'
import type { Weighing } from '@/lib/types'
import { createEmptyWeighing } from './weighings/constants'
import { WeighingFormDialog } from './weighings/WeighingFormDialog'
import { WeighingsHistorySection } from './weighings/WeighingsHistorySection'

type DialogState =
	| { mode: 'create'; initialWeighing: Weighing; originalWeighingId: null }
	| { mode: 'edit'; initialWeighing: Weighing; originalWeighingId: number | null }
	| null

export function WeighingsPage() {
	const queryClient = useQueryClient()
	const [selectedRegistration, setSelectedRegistration] = useState('')
	const [dialogState, setDialogState] = useState<DialogState>(null)
	const [selectedWeighingIds, setSelectedWeighingIds] = useState<Set<number>>(new Set())

	const glidersQuery = useQuery({
		queryKey: ['gliders'],
		queryFn: () => backend.getGliders(),
	})

	const selectedGlider = useMemo(
		() => glidersQuery.data?.find((item) => item.registration === selectedRegistration) ?? null,
		[glidersQuery.data, selectedRegistration],
	)
	const gliderLimitsQuery = useQuery({
		queryKey: ['gliderLimits', selectedRegistration],
		queryFn: () => backend.gliderLimits(selectedRegistration),
		enabled: Boolean(selectedRegistration),
	})

	const saveMutation = useMutation({
		mutationFn: async ({ weighing, originalWeighingId }: { weighing: Weighing; originalWeighingId: number | null }) => {
			await backend.addWeighings(selectedRegistration, [{ ...weighing, id: undefined }])
			if (originalWeighingId != null) {
				await backend.deleteWeighing(selectedRegistration, originalWeighingId)
			}
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['gliders'] })
			setDialogState(null)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: async (weighingIds: number[]) => {
			for (const weighingId of weighingIds) {
				await backend.deleteWeighing(selectedRegistration, weighingId)
			}
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['gliders'] })
			setSelectedWeighingIds(new Set())
		},
	})

	const openCreateDialog = () => {
		setDialogState({
			mode: 'create',
			initialWeighing: createEmptyWeighing(),
			originalWeighingId: null,
		})
	}

	const openEditDialog = (weighing: Weighing) => {
		setDialogState({
			mode: 'edit',
			initialWeighing: { ...weighing },
			originalWeighingId: weighing.id ?? null,
		})
	}

	const closeDialog = () => {
		setDialogState(null)
	}

	const deleteWeighings = (weighingIds: number[]) => {
		if (weighingIds.length === 0) {
			return
		}

		deleteMutation.mutate(weighingIds)
	}

	const mutationError = saveMutation.error ?? deleteMutation.error

	return (
		<div className="space-y-5">
			<div className="flex items-center gap-3">
				<Scale size={22} className="text-primary" strokeWidth={1.8} />
				<h1 className="text-xl font-bold text-foreground">
					Pesées
				</h1>
			</div>

			<Select value={selectedRegistration} onValueChange={(value: string | null) => { if (value) setSelectedRegistration(value) }}>
				<SelectTrigger className="w-64 bg-input/50">
					<SelectValue placeholder="Sélectionner un planeur…" />
				</SelectTrigger>
				<SelectContent>
					{glidersQuery.data?.map((item) => (
						<SelectItem key={item.registration} value={item.registration}>
							{item.registration}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{selectedGlider && (
				<>
					<WeighingsHistorySection
						glider={selectedGlider}
						limitsData={gliderLimitsQuery.data}
						selectedRegistration={selectedRegistration}
						selectedWeighingIds={selectedWeighingIds}
						isDeleting={deleteMutation.isPending}
						onSelectedWeighingIdsChange={setSelectedWeighingIds}
						onCreate={openCreateDialog}
						onEdit={openEditDialog}
						onDeleteSelection={deleteWeighings}
						onDeleteOne={(weighingId) => deleteWeighings([weighingId])}
					/>

					{mutationError != null && (
						<Alert variant="destructive">
							<AlertDescription className="whitespace-pre-wrap break-words">
								{apiError(mutationError)}
							</AlertDescription>
						</Alert>
					)}
				</>
			)}

			{dialogState != null && (
				<WeighingFormDialog
					mode={dialogState.mode}
					initialWeighing={dialogState.initialWeighing}
					originalWeighingId={dialogState.originalWeighingId}
					isSaving={saveMutation.isPending}
					canSave={Boolean(selectedRegistration)}
					onClose={closeDialog}
					onSave={(payload) => saveMutation.mutate(payload)}
				/>
			)}
		</div>
	)
}
