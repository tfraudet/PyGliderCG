import { Card, CardContent } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { WeighingDetailCard } from '@/components/weighings/WeighingDetailCard'
import { WeighingPilotLimitsCards } from '@/components/weighings/WeighingPilotLimitsCards'
import type { Glider, GliderCalcLimits } from '@/lib/types'
import { getLatestWeighing } from '@/lib/weighings'

interface WeighingTabProps {
  glider: Glider
  limitsData: GliderCalcLimits | null | undefined
}

export function WeighingTab({ glider, limitsData }: WeighingTabProps) {
  const latestWeighing = getLatestWeighing(glider.weighings)

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

  return (
    <TabsContent value="pesee" className="space-y-5">
      <WeighingDetailCard weighing={latestWeighing} limitsData={limitsData} />
      <WeighingPilotLimitsCards glider={glider} limitsData={limitsData} />
    </TabsContent>
  )
}
