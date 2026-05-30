import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { fr } from 'react-day-picker/locale'

import { Calendar } from '@/components/ui/calendar'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateInputPickerProps {
	value: string
	selectedDate?: Date
	isInvalid?: boolean
	onInputChange: (value: string) => void
	onSelectDate: (date: Date | undefined) => void
}

export function DateInputPicker({
	value,
	selectedDate,
	isInvalid = false,
	onInputChange,
	onSelectDate,
}: DateInputPickerProps) {
	const [open, setOpen] = useState(false)

	return (
		<div className="flex flex-col gap-1.5">
			<Popover open={open} onOpenChange={setOpen}>
				<InputGroup>
					<InputGroupInput
						value={value}
						onChange={(event) => onInputChange(event.target.value)}
						placeholder="JJ/MM/AAAA"
						inputMode="numeric"
						maxLength={10}
						aria-invalid={isInvalid || undefined}
						className="bg-input/50"
					/>
					<InputGroupAddon align="inline-end">
						<PopoverTrigger
							render={(
								<InputGroupButton
									variant="ghost"
									size="icon-sm"
									aria-label="Choisir une date"
								/>
							)}
						>
							<CalendarIcon />
						</PopoverTrigger>
					</InputGroupAddon>
				</InputGroup>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						locale={fr}
						captionLayout="dropdown"
						selected={selectedDate}
						onSelect={(date) => {
							onSelectDate(date)
							setOpen(false)
						}}
					/>
				</PopoverContent>
			</Popover>
			<p
				className={cn(
					'text-xs text-muted-foreground',
					isInvalid && 'text-destructive',
				)}
			>
				{isInvalid
					? 'Utiliser le format JJ/MM/AAAA ou choisir une date dans le calendrier.'
					: 'Saisir au format JJ/MM/AAAA ou choisir une date dans le calendrier.'}
			</p>
		</div>
	)
}
