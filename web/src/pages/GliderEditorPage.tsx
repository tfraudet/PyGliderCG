import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PlaneTakeoff, Save } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QueryErrorAlert } from '@/components/QueryErrorAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { backend } from '@/lib/api'
import { invalidateGliderQueries } from '@/hooks/use-app-queries'
import { queryKeys } from '@/lib/query-keys'
import { EMPTY_GLIDER, type Glider } from '@/lib/types'
import { FicheTab } from './glider-editor/FicheTab'
import { InventaireTab } from './glider-editor/InventaireTab'
import type { UpdateGliderDraft, UpdateInstruments, UpdateWeightBalances } from './glider-editor/types'
import { cloneGlider, getRegistrationError } from './glider-editor/utils'
import { WeightBalanceTab } from './glider-editor/WeightBalanceTab'

interface GliderEditorFormProps {
	mode: 'create' | 'edit'
	originalRegistration: string
	initialDraft: Glider
}

function GliderEditorForm({
	mode,
	originalRegistration,
	initialDraft,
}: GliderEditorFormProps) {
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const isCreateMode = mode === 'create'
	const [draft, setDraft] = useState(() => cloneGlider(initialDraft))
	const [showValidation, setShowValidation] = useState(false)

	const saveMutation = useMutation({
		mutationFn: async () => {
			const savedGlider = isCreateMode
				? await backend.createGlider(draft)
				: await backend.updateGlider(originalRegistration, draft)

			await backend.updateGliderInstruments(savedGlider.registration, draft.instruments)
			await backend.updateWeightBalances(savedGlider.registration, draft.weight_and_balances)

			return backend.getGlider(savedGlider.registration)
		},
		onSuccess: async (savedGlider) => {
			const successMessage = isCreateMode
				? `Le planeur ${savedGlider.registration} a été créé avec succès.`
				: `Le planeur ${savedGlider.registration} a été enregistré avec succès.`

			await invalidateGliderQueries(queryClient, [
				originalRegistration,
				savedGlider.registration,
			])

			setDraft(cloneGlider(savedGlider))
			window.scrollTo({ top: 0, behavior: 'smooth' })
			toast.success(successMessage)

			if (isCreateMode) {
				navigate(`/gliders/edit?registration=${encodeURIComponent(savedGlider.registration)}`, {
					replace: true,
				})
			}
		},
	})

	const updateDraft: UpdateGliderDraft = (updater) => {
		setDraft((current) => updater(current))
	}

	const updateInstruments: UpdateInstruments = (updater) => {
		updateDraft((current) => ({ ...current, instruments: updater(current.instruments) }))
	}

	const updateWeightBalances: UpdateWeightBalances = (updater) => {
		updateDraft((current) => ({ ...current, weight_and_balances: updater(current.weight_and_balances) }))
	}

	const registrationError = getRegistrationError(draft.registration, isCreateMode)

	const handleRegistrationChange = (nextRegistration: string) => {
		if (!isCreateMode) {
			return
		}

		updateDraft((current) => ({ ...current, registration: nextRegistration }))
		if (showValidation) {
			setShowValidation(false)
		}
	}

	const handleSave = () => {
		if (registrationError) {
			setShowValidation(true)
			return
		}

		saveMutation.mutate()
	}

	return (
		<>
			<QueryErrorAlert error={saveMutation.error} />

			{showValidation && registrationError && (
				<Alert variant="destructive">
					<AlertDescription>{registrationError}</AlertDescription>
				</Alert>
			)}

			<Tabs defaultValue="fiche" className="space-y-5">
				<TabsList className="border border-border/40 bg-muted/40">
					<TabsTrigger value="fiche">Fiche technique</TabsTrigger>
					<TabsTrigger value="inventaire">Inventaire</TabsTrigger>
					<TabsTrigger value="wb">Masse / centrage</TabsTrigger>
				</TabsList>

				<FicheTab
					draft={draft}
					isCreateMode={isCreateMode}
					showValidation={showValidation}
					registrationError={registrationError}
					onDraftChange={updateDraft}
					onRegistrationChange={handleRegistrationChange}
				/>

				<InventaireTab
					instruments={draft.instruments}
					onChange={updateInstruments}
				/>

				<WeightBalanceTab
					weightAndBalances={draft.weight_and_balances}
					onChange={updateWeightBalances}
				/>
			</Tabs>

			<div className="flex flex-wrap justify-end gap-3">
				<Button variant="outline" onClick={() => navigate('/gliders')}>
					<ArrowLeft data-icon="inline-start" />
					Retour à la liste planeur
				</Button>
				<Button onClick={handleSave} disabled={saveMutation.isPending}>
					<Save data-icon="inline-start" />
					{saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
				</Button>
			</div>

			<Separator className="my-2 bg-border/40" />
		</>
	)
}

export function GliderEditorPage({ mode }: { mode: 'create' | 'edit' }) {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const originalRegistration = searchParams.get('registration') ?? ''
	const isCreateMode = mode === 'create'

	const gliderQuery = useQuery({
		queryKey: queryKeys.glider(originalRegistration),
		queryFn: () => backend.getGlider(originalRegistration),
		enabled: !isCreateMode && Boolean(originalRegistration),
	})

	const blockingLoadError = !isCreateMode ? gliderQuery.error : null
	const showMissingRegistration = !isCreateMode && !originalRegistration

	if (showMissingRegistration) {
		return (
			<div className="space-y-5">
				<Button variant="outline" className="w-fit" onClick={() => navigate('/gliders')}>
					<ArrowLeft data-icon="inline-start" />
					Retour a la liste
				</Button>
				<Alert variant="destructive">
					<AlertDescription>Impossible d'ouvrir ce planeur sans immatriculation.</AlertDescription>
				</Alert>
			</div>
		)
	}

	const isBlockingLoadState = !isCreateMode && gliderQuery.isLoading
	const loadedDraft = isCreateMode ? EMPTY_GLIDER : gliderQuery.data

	return (
		<div className="space-y-5">
			<div className="flex items-center gap-3">
				<PlaneTakeoff size={22} className="text-primary" strokeWidth={1.8} />
				<h1 className="text-xl font-bold text-foreground">
					{isCreateMode ? 'Nouveau planeur' : 'Edition du planeur'}
				</h1>
			</div>

			{!gliderQuery.data && !isCreateMode && (
				<QueryErrorAlert error={blockingLoadError} />
			)}

			{isBlockingLoadState ? (
				<Card className="border-border/60 bg-card/80">
					<CardContent className="py-12 text-center text-muted-foreground">
						Chargement...
					</CardContent>
				</Card>
			) : loadedDraft ? (
				<GliderEditorForm
					key={isCreateMode ? 'create' : originalRegistration}
					mode={mode}
					originalRegistration={originalRegistration}
					initialDraft={loadedDraft}
				/>
			) : null}
		</div>
	)
}
