import { CircleHelp } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Glider } from '@/lib/types'
import { ARM_FIELDS, CENTERING_LIMIT_FIELDS, DATUM_OPTIONS, MASS_LIMIT_FIELDS, PILOT_POSITION_OPTIONS } from './constants'
import { NumberStepperField } from './NumberStepperField'
import type { UpdateGliderDraft } from './types'
import { getDatumOption, isChecked } from './utils'

interface FicheTabProps {
	draft: Glider
	isCreateMode: boolean
	showValidation: boolean
	registrationError: string | null
	onDraftChange: UpdateGliderDraft
	onRegistrationChange: (nextRegistration: string) => void
}

function FieldLabel({
	label,
	tooltip,
	className = 'text-xs text-muted-foreground',
}: {
	label: string
	tooltip?: string
	className?: string
}) {
	const hasTooltip = typeof tooltip === 'string' && tooltip.trim().length > 0

	return (
		<div className="flex items-center justify-between gap-2">
			<Label className={className}>{label}</Label>
			{hasTooltip ? (
				<Tooltip>
					<TooltipTrigger
						aria-label={`Informations pour ${label}`}
						className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
					>
						<CircleHelp size={15} />
					</TooltipTrigger>
					<TooltipContent side="top" className="max-w-64 text-center">
						{tooltip.trim()}
					</TooltipContent>
				</Tooltip>
			) : null}
		</div>
	)
}

export function FicheTab({
	draft,
	isCreateMode,
	showValidation,
	registrationError,
	onDraftChange,
	onRegistrationChange,
}: FicheTabProps) {
	const selectedDatum = getDatumOption(draft.datum)

	const updateTextField = <K extends 'model' | 'brand' | 'datum_label' | 'wedge' | 'wedge_position'>(
		key: K,
		value: Glider[K],
	) => {
		onDraftChange((current) => ({ ...current, [key]: value }))
	}

	return (
		<TabsContent value="fiche" className="space-y-5">
			<Card className="border-border/60 bg-card/80">
				<CardContent className="space-y-8 pt-6">
					<h2 className="text-3xl font-bold tracking-tight">Identification</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-1.5">
							<FieldLabel label="Immatriculation" tooltip="Identifiant officiel du planeur, au format enregistre dans la flotte." />
							<Input
								value={draft.registration}
								placeholder="TBD"
								aria-invalid={showValidation && Boolean(registrationError)}
								readOnly={!isCreateMode}
								onChange={(event) => onRegistrationChange(event.target.value)}
								className="bg-input/50 read-only:cursor-default read-only:opacity-100"
							/>
							{showValidation && registrationError && (
								<p className="text-sm text-destructive">{registrationError}</p>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<FieldLabel label="Modele" tooltip="Modele commercial ou designation du planeur." />
							<Input
								value={draft.model}
								onChange={(event) => updateTextField('model', event.target.value)}
								className="bg-input/50"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<FieldLabel label="Numero de serie" tooltip="Numero de serie constructeur permettant d identifier la cellule." />
							<Input
								type="number"
								value={draft.serial_number ?? ''}
								onChange={(event) => onDraftChange((current) => ({
									...current,
									serial_number: event.target.value === '' ? null : Number(event.target.value),
								}))}
								className="bg-input/50"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<FieldLabel label="Marque" tooltip="Constructeur ou marque associee au planeur." />
							<Input
								value={draft.brand}
								onChange={(event) => updateTextField('brand', event.target.value)}
								className="bg-input/50"
							/>
						</div>
						<div className="flex items-center gap-2 sm:col-span-2">
							<Checkbox
								checked={draft.single_seat}
								onCheckedChange={(checked) => onDraftChange((current) => ({
									...current,
									single_seat: isChecked(checked),
								}))}
								aria-label="Planeur monoplace"
							/>
							<Label>Monoplace</Label>
						</div>
					</div>

					<Separator className="bg-border/80" />

					<div className="space-y-5">
						<div className="space-y-2">
							<h2 className="text-3xl font-bold tracking-tight">Référence de pesée</h2>
							<div className="flex flex-col gap-1.5">
								<FieldLabel
									label="Plan de référence et type d'appui"
									tooltip=""
								/>
								<Select
									value={String(selectedDatum.value)}
									onValueChange={(value) => onDraftChange((current) => ({ ...current, datum: Number(value) }))}
								>
									<SelectTrigger className="h-11 w-full bg-input/50">
										<SelectValue>{selectedDatum.label}</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{DATUM_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={String(option.value)}>
													{option.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-start">
							<div className="space-y-4">
								<div className="overflow-hidden rounded-xl border border-border/60 bg-white">
									<img
										src={selectedDatum.image}
										alt={`Schéma ${selectedDatum.label}`}
										className="h-auto w-full object-contain"
									/>
								</div>

								<div className="space-y-2">
									<FieldLabel
										label="Position du pilote"
										tooltip=""
									/>
									<div className="flex flex-col gap-2">
										{PILOT_POSITION_OPTIONS.map((option) => (
											<label key={option.value} className="flex items-center gap-2 text-sm text-foreground">
												<input
													type="radio"
													name="pilot-position"
													value={option.value}
													checked={draft.pilot_position === option.value}
													onChange={() => onDraftChange((current) => ({
														...current,
														pilot_position: option.value,
													}))}
													className="size-4 accent-destructive"
												/>
												<span>{option.label}</span>
											</label>
										))}
									</div>
								</div>
							</div>

							<div className="grid gap-4">
								<div className="flex flex-col gap-1.5">
									<FieldLabel label="Plan de référence" tooltip="" />
									<Input
										value={draft.datum_label}
										onChange={(event) => updateTextField('datum_label', event.target.value)}
										className="bg-input/50"
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<FieldLabel label="Cale de référence" tooltip="" />
									<Input
										value={draft.wedge}
										onChange={(event) => updateTextField('wedge', event.target.value)}
										className="bg-input/50"
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<FieldLabel
										label="Position de la cale de référence"
										tooltip=""
									/>
									<Input
										value={draft.wedge_position}
										onChange={(event) => updateTextField('wedge_position', event.target.value)}
										className="bg-input/50"
									/>
								</div>
							</div>
						</div>
					</div>

					<Separator className="bg-border/80" />

					<div className="space-y-5">
						<div className="space-y-2">
							<h2 className="text-3xl font-bold tracking-tight">Limites de masse et bras de leviers</h2>
						</div>

						<div className="grid gap-4 xl:grid-cols-2 xl:items-start">
							<div className="space-y-4">
								<div className="space-y-3">
									<h3 className="text-lg font-semibold text-foreground">Limitations de masse</h3>
									<div className="rounded-2xl border border-border/60 p-4">
										<div className="flex flex-col gap-5">
											{MASS_LIMIT_FIELDS.map((field) => (
												<NumberStepperField
													key={field.key}
													label={field.label}
													tooltip={field.tooltip}
													value={draft.limits[field.key]}
													step={field.step}
													onChange={(nextValue) => onDraftChange((current) => ({
														...current,
														limits: {
															...current.limits,
															[field.key]: nextValue,
														},
													}))}
												/>
											))}
										</div>
									</div>
								</div>

								<div className="space-y-3">
									<h3 className="text-lg font-semibold text-foreground">Limites de centrage</h3>
									<div className="rounded-2xl border border-border/60 p-4">
										<div className="flex flex-col gap-5">
											{CENTERING_LIMIT_FIELDS.map((field) => (
												<NumberStepperField
													key={field.key}
													label={field.label}
													tooltip={field.tooltip}
													value={draft.limits[field.key]}
													step={field.step}
													onChange={(nextValue) => onDraftChange((current) => ({
														...current,
														limits: {
															...current.limits,
															[field.key]: nextValue,
														},
													}))}
												/>
											))}
										</div>
									</div>
								</div>
							</div>

							<div className="space-y-3">
								<h3 className="text-lg font-semibold text-foreground">Bras de leviers</h3>
								<div className="rounded-2xl border border-border/60 p-4">
									<div className="flex flex-col gap-5">
										{ARM_FIELDS.map((field) => (
											<NumberStepperField
												key={field.key}
												label={field.label}
												tooltip={field.tooltip}
												value={Number(draft.arms[field.key] ?? 0)}
												step={field.step}
												onChange={(nextValue) => onDraftChange((current) => ({
													...current,
													arms: {
														...current.arms,
														[field.key]: nextValue,
													},
												}))}
											/>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</TabsContent>
	)
}
