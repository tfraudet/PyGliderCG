import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PlaneTakeoff, Save } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiError, backend } from '@/lib/api'
import { EMPTY_GLIDER } from '@/lib/types'
import { FicheTab } from './glider-editor/FicheTab'
import { InventaireTab } from './glider-editor/InventaireTab'
import type { UpdateGliderDraft, UpdateInstruments, UpdateWeightBalances } from './glider-editor/types'
import { cloneGlider, getRegistrationError } from './glider-editor/utils'
import { WeightBalanceTab } from './glider-editor/WeightBalanceTab'

export function GliderEditorPage({ mode }: { mode: 'create' | 'edit' }) {
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const originalRegistration = searchParams.get('registration') ?? ''
	const isCreateMode = mode === 'create'
	const [draft, setDraft] = useState(() => cloneGlider(EMPTY_GLIDER))
	const [showValidation, setShowValidation] = useState(false)

	const gliderQuery = useQuery({
		queryKey: ['glider', originalRegistration],
		queryFn: () => backend.getGlider(originalRegistration),
		enabled: !isCreateMode && Boolean(originalRegistration),
	})

	useEffect(() => {
		if (isCreateMode) {
			setDraft(cloneGlider(EMPTY_GLIDER))
			return
		}

		if (gliderQuery.data) {
			setDraft(cloneGlider(gliderQuery.data))
		}
	}, [gliderQuery.data, isCreateMode])

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

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['gliders'] }),
				queryClient.invalidateQueries({ queryKey: ['glider', originalRegistration] }),
				queryClient.invalidateQueries({ queryKey: ['glider', savedGlider.registration] }),
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
	const saveError = saveMutation.error
	const blockingLoadError = !isCreateMode ? gliderQuery.error : null
	const showMissingRegistration = !isCreateMode && !originalRegistration

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
	const shouldRenderEditor = !blockingLoadError || Boolean(gliderQuery.data) || isCreateMode

	return (
		<div className="space-y-5">
			<div className="flex items-center gap-3">
				<PlaneTakeoff size={22} className="text-primary" strokeWidth={1.8} />
				<h1 className="text-xl font-bold text-foreground">
					{isCreateMode ? 'Nouveau planeur' : 'Edition du planeur'}
				</h1>
			</div>

			{saveError && (
				<Alert variant="destructive">
					<AlertDescription className="whitespace-pre-wrap break-words">{apiError(saveError)}</AlertDescription>
				</Alert>
			)}

			{showValidation && registrationError && (
				<Alert variant="destructive">
					<AlertDescription>{registrationError}</AlertDescription>
				</Alert>
			)}

			{blockingLoadError && !gliderQuery.data && !isCreateMode && (
				<Alert variant="destructive">
					<AlertDescription className="whitespace-pre-wrap break-words">{apiError(blockingLoadError)}</AlertDescription>
				</Alert>
			)}

			{isBlockingLoadState ? (
				<Card className="border-border/60 bg-card/80">
					<CardContent className="py-12 text-center text-muted-foreground">
						Chargement...
					</CardContent>
				</Card>
			) : shouldRenderEditor ? (
				<>
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
						<Button
							onClick={handleSave}
							disabled={saveMutation.isPending || isBlockingLoadState}
						>
							<Save data-icon="inline-start" />
							{saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
						</Button>
					</div>

					<Separator className="my-2 bg-border/40" />
				</>
			) : null}
		</div>
	)
}
