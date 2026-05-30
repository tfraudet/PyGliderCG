import { Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Glider, GliderCalcLimits } from '@/lib/types'
import { buildCabinSections, formatMetricValue } from '@/lib/weighings'

interface WeighingPilotLimitsCardsProps {
	glider: Glider
	limitsData: GliderCalcLimits | null | undefined
}

export function WeighingPilotLimitsCards({ glider, limitsData }: WeighingPilotLimitsCardsProps) {
	const { cabinSections, calculatedPilotMax, retainedPilotMax, usefulLoadLimit, seatLimit } = buildCabinSections(glider, limitsData)

	return (
		<>
			{cabinSections.map((section) => (
				<Card key={section.title} className="border-border/60 bg-card/80">
					<CardContent className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
						<section className="space-y-5">
							<div>
								<p className="text-lg text-foreground">{section.title}</p>
							</div>

							<div className="space-y-4">
								<div className="space-y-1">
									<p className="text-xs text-muted-foreground">{section.calculatedMinLabel}</p>
									<p className="text-xl font-semibold text-green-500">
										{formatMetricValue(section.calculatedMin)} kg
									</p>
								</div>

								<div className="space-y-1">
									<p className="text-xs text-muted-foreground">{section.calculatedMaxLabel}</p>
									<p className="text-xl font-semibold text-green-500">
										{formatMetricValue(calculatedPilotMax)} kg
									</p>
								</div>
							</div>
						</section>

						<section className="space-y-5">
							<p className="text-lg text-foreground">Etiquette cabine / Valeurs retenues</p>

							<div className="space-y-4">
								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">
										{section.retainedMinLabel}{' '}
										<span className="font-semibold text-green-500">{formatMetricValue(section.retainedMin)} kg</span>
										{section.retainedMinReason ? `, (${section.retainedMinReason})` : ''}
									</p>
								</div>

								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">
										{section.retainedMaxLabel}{' '}
										<span className="font-semibold text-green-500">{formatMetricValue(retainedPilotMax.value)} kg</span>
										{retainedPilotMax.reason ? `, (${retainedPilotMax.reason})` : ''}
									</p>
								</div>
							</div>

							{section.showInfo && (
								<div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-4 text-sky-100">
									<div className="flex items-start gap-3">
										<Info size={18} className="mt-0.5 shrink-0 text-sky-300" />
										<p className="text-sm leading-7">
											Charge utile de <span className="font-semibold text-green-500">{formatMetricValue(usefulLoadLimit)} kg</span>
											{' '}dans le respect des limitations de masse, de centrage
											{seatLimit != null ? ` et de siège à ${formatMetricValue(seatLimit)} kg` : ''}
										</p>
									</div>
								</div>
							)}
						</section>
					</CardContent>
				</Card>
			))}
		</>
	)
}
