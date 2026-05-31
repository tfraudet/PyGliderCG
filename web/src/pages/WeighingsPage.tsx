import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/QueryErrorAlert'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { backend } from '@/lib/api'
import { invalidateGliderQueries, useGliderLimits, useGliders } from '@/hooks/use-app-queries'
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
	const [selectedDetailWeighing, setSelectedDetailWeighing] = useState<Weighing | null>(null)

	const glidersQuery = useGliders()

	const selectedGlider = useMemo(
		() => glidersQuery.data?.find((item) => item.registration === selectedRegistration) ?? null,
		[glidersQuery.data, selectedRegistration],
	)
	const gliderLimitsQuery = useGliderLimits(selectedRegistration)

	const saveMutation = useMutation({
		mutationFn: async ({
			mode,
			weighing,
			originalWeighingId,
		}: {
			mode: 'create' | 'edit'
			weighing: Weighing
			originalWeighingId: number | null
		}) => {
			if (mode === 'edit') {
				if (originalWeighingId == null) {
					throw new Error('Missing weighing id for update')
				}

				await backend.updateWeighing(selectedRegistration, originalWeighingId, weighing)
				return
			}

			await backend.addWeighings(selectedRegistration, [{ ...weighing, id: undefined }])
		},
		onSuccess: async () => {
			await invalidateGliderQueries(queryClient, [selectedRegistration])
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
			await invalidateGliderQueries(queryClient, [selectedRegistration])
			setSelectedWeighingIds(new Set())
		},
	})

	const printMutation = useMutation({
		mutationFn: async ({
			weighing,
			previewWindow,
		}: {
			weighing: Weighing
			previewWindow: Window | null
		}) => {
			if (weighing.id == null) {
				throw new Error('Missing weighing id for print')
			}

			const pdfBlob = await backend.printWeighing(selectedRegistration, weighing.id)
			const pdfUrl = window.URL.createObjectURL(pdfBlob)

			if (previewWindow != null) {
				previewWindow.location.href = pdfUrl
			} else {
				const link = document.createElement('a')
				link.href = pdfUrl
				link.target = '_blank'
				link.rel = 'noopener noreferrer'
				link.click()
			}

			window.setTimeout(() => {
				window.URL.revokeObjectURL(pdfUrl)
			}, 60_000)
		},
		onError: (_error, variables) => {
			variables.previewWindow?.close()
		},
	})

	const handleRegistrationChange = (value: string | null) => {
		if (!value || value === selectedRegistration) {
			return
		}

		setDialogState(null)
		setSelectedWeighingIds(new Set())
		setSelectedDetailWeighing(null)
		saveMutation.reset()
		deleteMutation.reset()
		printMutation.reset()
		setSelectedRegistration(value)
	}

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

	const handlePrintWeighing = () => {
		if (selectedDetailWeighing == null) {
			return
		}

		printMutation.mutate({
			weighing: selectedDetailWeighing,
			previewWindow: window.open('', '_blank'),
		})
	}

	const mutationError = saveMutation.error ?? deleteMutation.error ?? printMutation.error

	return (
		<div className="space-y-5">
			<div className="flex items-center gap-3">
				<Scale size={22} className="text-primary" strokeWidth={1.8} />
				<h1 className="text-3xl font-bold text-foreground">
					Pesées
				</h1>
			</div>

			<QueryErrorAlert error={glidersQuery.error} />

			<Select value={selectedRegistration} onValueChange={handleRegistrationChange}>
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
					<QueryErrorAlert error={gliderLimitsQuery.error} />

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
						onSelectedDetailWeighingChange={setSelectedDetailWeighing}
					/>

					<QueryErrorAlert error={mutationError} />

					<Button
						variant="default"
						onClick={handlePrintWeighing}
						disabled={selectedDetailWeighing == null || printMutation.isPending}
					>
						<Printer />
						Imprimer la fiche pesée
					</Button>
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
