import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Weighing } from '@/lib/types'
import { DateInputPicker } from '../glider-editor/DateInputPicker'
import {
	applyDateMask,
	formatDateForStorage,
	formatDateInput,
	parseDateInput,
	parseStoredDate,
} from '../glider-editor/utils'
import { WEIGHING_FIELDS, WEIGHING_FORM_LABELS } from './constants'

interface WeighingFormDialogProps {
	mode: 'create' | 'edit'
	initialWeighing: Weighing
	originalWeighingId: number | null
	isSaving: boolean
	canSave: boolean
	onClose: () => void
	onSave: (payload: { mode: 'create' | 'edit'; weighing: Weighing; originalWeighingId: number | null }) => void
}

export function WeighingFormDialog({
	mode,
	initialWeighing,
	originalWeighingId,
	isSaving,
	canSave,
	onClose,
	onSave,
}: WeighingFormDialogProps) {
	const [draft, setDraft] = useState<Weighing>(initialWeighing)
	const [draftDateInput, setDraftDateInput] = useState(formatDateInput(initialWeighing.date))
	const draftDateInvalid = draftDateInput.length > 0 && !parseDateInput(draftDateInput)
	const selectedDraftDate = parseStoredDate(draft.date)

	return (
		<Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
			<DialogContent className="sm:max-w-4xl">
				<DialogHeader>
					<DialogTitle>{mode === 'edit' ? 'Modifier la pesée' : 'Nouvelle pesée'}</DialogTitle>
					<DialogDescription>
						{mode === 'edit'
							? 'Modifier la pesée sélectionnée pour le planeur choisi.'
							: 'Ajouter une nouvelle pesée pour le planeur sélectionné.'}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{WEIGHING_FIELDS.map((field) => (
						<div key={field} className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground">
								{WEIGHING_FORM_LABELS[field]}
							</Label>
							{field === 'date' ? (
								<DateInputPicker
									value={draftDateInput}
									selectedDate={selectedDraftDate}
									isInvalid={draftDateInvalid}
									onInputChange={(value) => {
										const maskedValue = applyDateMask(value)
										setDraftDateInput(maskedValue)
										setDraft((current) => ({
											...current,
											date: parseDateInput(maskedValue) ?? '',
										}))
									}}
									onSelectDate={(date) => {
										const nextValue = date ? formatDateForStorage(date) : ''
										setDraftDateInput(formatDateInput(nextValue))
										setDraft((current) => ({
											...current,
											date: nextValue,
										}))
									}}
								/>
							) : (
								<Input
									type="number"
									step="any"
									value={draft[field] as string | number}
									onChange={(event) => setDraft((current) => ({
										...current,
										[field]: Number(event.target.value),
									}))}
									className="bg-input/50 font-mono"
								/>
							)}
						</div>
					))}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Annuler
					</Button>
					<Button
						onClick={() => onSave({ mode, weighing: draft, originalWeighingId })}
						disabled={isSaving || !canSave || draftDateInvalid}
					>
						{isSaving ? 'Enregistrement…' : mode === 'edit' ? 'Enregistrer' : 'Ajouter'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
