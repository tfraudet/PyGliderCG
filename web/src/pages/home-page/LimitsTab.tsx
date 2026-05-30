import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'
import type { Glider } from '@/lib/types'
import { ARM_FIELDS, CENTERING_LIMIT_FIELDS, MASS_LIMIT_FIELDS } from './config'

function ReadonlyFieldList<T extends object>({
  fields,
  values,
}: {
  fields: Array<{ key: keyof T; label: string }>
  values: T
}) {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardContent className="space-y-4 px-4 py-4">
        {fields.map(({ key, label }) => (
          <div key={String(key)} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input value={String(values[key] ?? '—')} readOnly className="bg-input/50 font-mono" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

interface LimitsTabProps {
  glider: Glider
}

export function LimitsTab({ glider }: LimitsTabProps) {
  return (
    <TabsContent value="limites">
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Limites de masse et bras de leviers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <section className="space-y-2">
                <h3 className="text-lg text-foreground">Limitations de masse</h3>
                <ReadonlyFieldList fields={MASS_LIMIT_FIELDS} values={glider.limits} />
              </section>

              <section className="space-y-2">
                <h3 className="text-lg text-foreground">Limites de centrage</h3>
                <ReadonlyFieldList fields={CENTERING_LIMIT_FIELDS} values={glider.limits} />
              </section>
            </div>

            <section className="space-y-2">
              <h3 className="text-lg text-foreground">Bras de leviers</h3>
              <ReadonlyFieldList fields={ARM_FIELDS} values={glider.arms} />
            </section>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
