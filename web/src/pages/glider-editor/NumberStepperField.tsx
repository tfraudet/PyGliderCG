import { CircleHelp, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface NumberStepperFieldProps {
	label: string
	value: number
	step: number
	onChange: (nextValue: number) => void
}

export function NumberStepperField({ label, value, step, onChange }: NumberStepperFieldProps) {
	return (
		<div className="space-y-2.5">
			<div className="flex items-center justify-between gap-2">
				<Label className="text-sm font-medium text-foreground">{label}</Label>
				<CircleHelp className="text-muted-foreground" size={15} />
			</div>
			<div className="flex items-center gap-1 rounded-xl bg-input/50 px-3">
				<input
					type="number"
					step={step}
					value={Number.isFinite(value) ? value : 0}
					onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
					className="h-10 flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-7 shrink-0"
					onClick={() => onChange(Number((value - step).toFixed(3)))}
				>
					<Minus />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-7 shrink-0"
					onClick={() => onChange(Number((value + step).toFixed(3)))}
				>
					<Plus />
				</Button>
			</div>
		</div>
	)
}
