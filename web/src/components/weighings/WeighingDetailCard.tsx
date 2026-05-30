import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GliderCalcLimits, Weighing } from '@/lib/types'
import {
	formatDateLabel,
	formatMetricValue,
	WEIGHING_FIELD_COLUMNS,
	WEIGHING_SUMMARY_COLUMNS,
} from '@/lib/weighings'

interface WeighingDetailCardProps {
	weighing: Weighing
	limitsData?: GliderCalcLimits | null
	showSummary?: boolean
}

export function WeighingDetailCard({
	weighing,
	limitsData,
	showSummary = true,
}: WeighingDetailCardProps) {
	return (
		<Card className="border-border/60 bg-card/80">
			<CardHeader className="pb-3">
				<CardTitle className="text-xl">
					Détails de la pesée
					{weighing.id ? ` #${weighing.id}` : ''}
					{' '}du {formatDateLabel(weighing.date)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-8 px-4 pb-4">
				<div className="grid gap-4 lg:grid-cols-2">
					{WEIGHING_FIELD_COLUMNS.map((column, columnIndex) => (
						<div key={columnIndex} className="space-y-4">
							{column.map(({ key, label, decimals = 1 }) => (
								<div key={key} className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">{label}</Label>
									<Input
										value={formatMetricValue(weighing[key], decimals)}
										readOnly
										className="bg-input/60 font-mono text-base"
									/>
								</div>
							))}
						</div>
					))}
				</div>

				{showSummary && limitsData != null && (
					<div className="grid gap-8 lg:grid-cols-2">
						{WEIGHING_SUMMARY_COLUMNS.map((column, columnIndex) => (
							<div key={columnIndex} className="space-y-6">
								{column.map(({ key, label }) => (
									<div key={key} className="space-y-2">
										<p className="text-xs text-muted-foreground">{label}</p>
										<p className="text-4xl font-semibold tracking-tight text-foreground">
											{formatMetricValue(limitsData[key])}
										</p>
									</div>
								))}
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
