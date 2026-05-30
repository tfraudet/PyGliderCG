import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'
import type { Glider, GliderCalcLimits } from '@/lib/types'
import { WEIGHING_FIELD_COLUMNS, WEIGHING_SUMMARY_COLUMNS } from './config'
import { formatDateLabel, formatMetricValue, getRetainedPilotMax, getRetainedPilotMin } from './utils'

interface WeighingTabProps {
  glider: Glider
  limitsData: GliderCalcLimits | null | undefined
}

interface CabinSection {
  title: string
  calculatedMinLabel: string
  calculatedMaxLabel: string
  retainedMinLabel: string
  retainedMaxLabel: string
  calculatedMin: number | null
  retainedMin: number | null
  retainedMinReason: string | null
  showInfo: boolean
}

export function WeighingTab({ glider, limitsData }: WeighingTabProps) {
  const latestWeighing = glider.weighings.at(-1) ?? null

  if (!latestWeighing) {
    return (
      <TabsContent value="pesee" className="space-y-5">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="px-4 py-8 text-sm text-muted-foreground">
            Aucune pesée enregistrée pour ce planeur.
          </CardContent>
        </Card>
      </TabsContent>
    )
  }

  const monoplacePilotMin = limitsData?.pilot_av_mini ?? null
  const biplacePilotMin = limitsData?.pilot_av_mini_duo ?? monoplacePilotMin
  const calculatedPilotMax = limitsData?.pilot_av_maxi ?? null
  const manualPilotMin = glider.limits.weight_min_pilot ?? null
  const usefulLoadLimit = limitsData?.cu ?? null
  const seatLimit = glider.limits.mm_harnais ?? null
  const retainedMonoplacePilotMin = getRetainedPilotMin(manualPilotMin, monoplacePilotMin)
  const retainedBiplacePilotMin = getRetainedPilotMin(manualPilotMin, biplacePilotMin)
  const retainedPilotMax = getRetainedPilotMax(calculatedPilotMax, usefulLoadLimit, seatLimit)

  const cabinSections: CabinSection[] = glider.single_seat
    ? [
        {
          title: 'Monoplace',
          calculatedMinLabel: 'Masse mini pilote calculé:',
          calculatedMaxLabel: 'Masse maxi pilote calculé:',
          retainedMinLabel: 'Masse mini pilote',
          retainedMaxLabel: 'Masse maxi pilote',
          calculatedMin: monoplacePilotMin,
          retainedMin: retainedMonoplacePilotMin.value,
          retainedMinReason: retainedMonoplacePilotMin.reason,
          showInfo: true,
        },
      ]
    : [
        {
          title: 'En monoplace',
          calculatedMinLabel: 'Masse mini pilote calculé:',
          calculatedMaxLabel: 'Masse maxi pilote calculé:',
          retainedMinLabel: 'Masse mini pilote',
          retainedMaxLabel: 'Masse maxi pilote',
          calculatedMin: monoplacePilotMin,
          retainedMin: retainedMonoplacePilotMin.value,
          retainedMinReason: retainedMonoplacePilotMin.reason,
          showInfo: false,
        },
        {
          title: 'En biplace',
          calculatedMinLabel: 'Masse mini pilote avant calculé:',
          calculatedMaxLabel: 'Masse maxi pilote avant calculé:',
          retainedMinLabel: 'Masse mini pilote avant',
          retainedMaxLabel: 'Masse maxi pilote avant',
          calculatedMin: biplacePilotMin,
          retainedMin: retainedBiplacePilotMin.value,
          retainedMinReason: retainedBiplacePilotMin.reason,
          showInfo: true,
        },
      ]

  return (
    <TabsContent value="pesee" className="space-y-5">
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">
            Détails de la pesée
            {latestWeighing.id ? ` #${latestWeighing.id}` : ''}
            {' '}du {formatDateLabel(latestWeighing.date)}
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
                      value={formatMetricValue(latestWeighing[key], decimals)}
                      readOnly
                      className="bg-input/60 font-mono text-base"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {WEIGHING_SUMMARY_COLUMNS.map((column, columnIndex) => (
              <div key={columnIndex} className="space-y-6">
                {column.map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-4xl font-semibold tracking-tight text-foreground">
                      {formatMetricValue(limitsData?.[key])}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
    </TabsContent>
  )
}
