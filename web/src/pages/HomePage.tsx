import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Calculator, TriangleAlert, UserRound, UsersRound, Barcode, Plane, Plus, Minus, Users, Droplet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { apiError, backend } from '@/lib/api'
import type { Arms, Limits } from '@/lib/types'

const PAYLOAD_LABELS: Record<string, string> = {
  front_pilot_weight:       'Masse pilote avant équipé (en kg)',
  rear_pilot_weight:        'Masse pilote arrière équipé (kg))',
  front_ballast_weight:     'Masse Gueuse avant (kg)',
  rear_ballast_weight:      'Masse Gueuse ou water ballast arrière (kg)',
  wing_water_ballast_weight:'Masse d\'eau dans les ailes (kg)',
}

const PAYLOAD_SECTIONS = [
  {
    title: 'Poids Pilotes & Gueuse',
    icon: Users,
    fields: ['front_pilot_weight', 'rear_pilot_weight', 'front_ballast_weight'],
  },
  {
    title: 'Ballast d\'eau',
    icon: Droplet,
    fields: ['wing_water_ballast_weight', 'rear_ballast_weight'],
  },
]

const MASS_LIMIT_FIELDS: Array<{ key: keyof Limits, label: string }> = [
  { key: 'mmwp', label: 'MMWP (kg)' },
  { key: 'mmwv', label: 'MMWV (kg)' },
  { key: 'mmenp', label: 'MMENP (kg)' },
  { key: 'mm_harnais', label: 'MMHarnais (kg)' },
  { key: 'weight_min_pilot', label: 'Masse mini pilote (kg)' },
]

const CENTERING_LIMIT_FIELDS: Array<{ key: keyof Limits, label: string }> = [
  { key: 'front_centering', label: 'Centrage avant (mm)' },
  { key: 'rear_centering', label: 'Centrage arrière (mm)' },
]

const ARM_FIELDS: Array<{ key: keyof Arms, label: string }> = [
  { key: 'arm_front_pilot', label: 'Bras de levier pilote avant(mm)' },
  { key: 'arm_rear_pilot', label: 'Bras de levier pilote arrière (mm)' },
  { key: 'arm_waterballast', label: 'Bras de levier waterballast (mm)' },
  { key: 'arm_front_ballast', label: 'Bras de levier gueuse avant (mm)' },
  { key: 'arm_rear_watterballast_or_ballast', label: 'Bras de levier ballast ou gueuse arrière (mm)' },
  { key: 'arm_instruments_panel', label: 'Bras de levier tableau de bord (mm)' },
]

export function HomePage() {
  const glidersQuery = useQuery({
    queryKey: ['gliders'],
    queryFn: () => backend.getGliders(),
  })
  const [selected, setSelected] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [payload, setPayload] = useState({
    front_pilot_weight: 0,
    rear_pilot_weight: 0,
    front_ballast_weight: 0,
    rear_ballast_weight: 0,
    wing_water_ballast_weight: 0,
  })

  const selectedGlider = useMemo(
    () => glidersQuery.data?.find((g) => g.registration === selected) ?? null,
    [glidersQuery.data, selected],
  )

  const gliderLimitsQuery = useQuery({
    queryKey: ['gliderLimits', selected],
    queryFn: () => backend.gliderLimits(selected),
    enabled: !!selected,
  })

  const calcMutation = useMutation({
    mutationFn: () => backend.calculateWeightBalance(selected, payload),
  })

  useEffect(() => {
    calcMutation.reset()
  }, [selected])


  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calculator size={22} className="text-primary" strokeWidth={1.8} />
        <h1
          className="text-xl font-bold text-foreground"
        >
          Calculateur de centrage
        </h1>
      </div>

      <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-200">
        <TriangleAlert size={15} className="text-amber-400" />
        <AlertDescription className="text-xs">
          Attention : Ce logiciel est un outil d'aide à la décision pour le calcul du centrage. La fiche de pesée est le document de référence, et la responsabilité finale du centrage incombe au commandant de bord.
        </AlertDescription>
      </Alert>

      {/* Glider selector */}
      <Card>
        <CardHeader className="flex flex-wrap items-center gap-3">
          <CardTitle>Planeur</CardTitle>

          <Select value={selected} onValueChange={(v: string | null) => { if (v) setSelected(v) }} disabled={glidersQuery.isLoading}>
            <SelectTrigger className="bg-input/50 min-w-[15rem]">
              <SelectValue placeholder={glidersQuery.isLoading ? 'Chargement…' : 'Sélectionner un planeur…'} />
            </SelectTrigger>
            <SelectContent>
              {glidersQuery.data?.map((glider) => (
                <SelectItem key={glider.registration} value={glider.registration}>
                  {glider.registration} — {glider.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {selectedGlider && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">
                <Plane size={11} className="mr-1"/>
                {selectedGlider.brand}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Barcode size={11} className="mr-1"/>
                {selectedGlider.model}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedGlider.single_seat ?  <UserRound /> : <UsersRound /> }
                {selectedGlider.single_seat ? 'Monoplace' : 'Biplace'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGlider && (
        <>
          <Tabs defaultValue="centrage">
            <TabsList className="bg-muted/40 border border-border/40">
              <TabsTrigger value="centrage">Centrage</TabsTrigger>
              <TabsTrigger value="limites">Limites & Bras</TabsTrigger>
            </TabsList>

            <TabsContent value="centrage" className="space-y-5">
              {/* Weight inputs */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {PAYLOAD_SECTIONS.map(({ title, icon: Icon, fields }) => (
                  <Card key={title} className="border-border/60 bg-card/80">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon size={18} className="text-primary text-blue-600 dark:text-sky-400" />
                        {title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 pb-4">
                      {fields.map((key) => {
                        const isRearPilot = key === 'rear_pilot_weight';
                        const isFrontBallast = key === 'front_ballast_weight';
                        const isRearBallast = key === 'rear_ballast_weight';
                        const isWaterBallast = key === 'wing_water_ballast_weight';
                        const isPilot = key.includes('pilot');
                        const isMonoplane = selectedGlider?.single_seat;
                        const isFrontBallastArmZero = selectedGlider?.arms?.arm_front_ballast === 0;
                        const isRearBallastArmZero = selectedGlider?.arms?.arm_rear_watterballast_or_ballast === 0;
                        const isWaterBallastArmZero = selectedGlider?.arms?.arm_waterballast === 0;
                        const isDisabled = (isRearPilot && isMonoplane) || (isFrontBallast && isFrontBallastArmZero) || (isRearBallast && isRearBallastArmZero) || (isWaterBallast && isWaterBallastArmZero);
                        
                        const totalPilotWeight = (payload.front_pilot_weight || 0) + (payload.rear_pilot_weight || 0);
                        const harnessMax = selectedGlider?.limits?.mm_harnais ?? 0;
                        const showHarnessError = isPilot && focusedField === key && totalPilotWeight > harnessMax;
                        const canIncrement = !(isPilot && totalPilotWeight > harnessMax);
                        
                        return (
                          <div key={key} className="space-y-1.5">
                            <Label className={`text-xs ${isDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                              {PAYLOAD_LABELS[key] ?? key}
                            </Label>
                            <InputGroup>
                              <InputGroupInput
                                type="number"
                                min={0}
                                step={0.5}
                                value={payload[key as keyof typeof payload]}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setPayload((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))
                                }
                                onFocus={() => setFocusedField(key)}
                                onBlur={() => setFocusedField(null)}
                                placeholder="0"
                                disabled={isDisabled}
                                className={`font-mono text-center [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden [-moz-appearance:textfield] ${showHarnessError ? 'border-red-500 focus-visible:ring-red-500/50' : ''}`}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={isDisabled}
                                  onClick={() =>
                                    setPayload((prev) => ({
                                      ...prev,
                                      [key]: Math.max(0, prev[key as keyof typeof payload] - 0.5),
                                    }))
                                  }
                                >
                                  <Minus size={14} />
                                </InputGroupButton>
                                <InputGroupButton
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={isDisabled || !canIncrement}
                                  onClick={() =>
                                    setPayload((prev) => ({
                                      ...prev,
                                      [key]: prev[key as keyof typeof payload] + 0.5,
                                    }))
                                  }
                                >
                                  <Plus size={14} />
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                            {showHarnessError && (
                              <p className="text-xs text-red-500 font-medium">
                                Dépasse le poids max du harnais ({harnessMax} kg)
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                className="gap-2 w-full md:w-auto"
                onClick={() => calcMutation.mutate()}
                disabled={calcMutation.isPending}
              >
                <Calculator size={15} />
                {calcMutation.isPending ? 'Calcul…' : 'Calculer le centrage'}
              </Button>

              {/* Error */}
              {calcMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription>{apiError(calcMutation.error)}</AlertDescription>
                </Alert>
              )}

              {/* Result */}
              {calcMutation.data && (
                <Card className="border-border/60 bg-card/80">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">Résultats du calcul</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {(() => {
                        const centragePassed = selectedGlider &&
                          calcMutation.data.center_of_gravity >= selectedGlider.limits.front_centering &&
                          calcMutation.data.center_of_gravity <= selectedGlider.limits.rear_centering
                        return (
                          <div className="space-y-2 sm:border-r sm:border-border/40 sm:pr-4 text-center">
                            <p className="text-xs text-muted-foreground">Centrage (mm)</p>
                            <p className={`font-mono text-2xl font-bold ${centragePassed ? 'text-green-500' : 'text-red-500'}`}>
                              {calcMutation.data.center_of_gravity.toFixed(1)} mm
                            </p>
                            <div className="flex items-center justify-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${centragePassed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                {centragePassed ? (
                                  <span className="text-xs text-green-500">✓</span>
                                ) : (
                                  <X size={14} className="text-red-500" />
                                )}
                              </div>
                              <p className={`text-xs font-semibold ${centragePassed ? 'text-green-500' : 'text-red-500'}`}>
                                {centragePassed ? 'Pass' : 'Failed'}
                              </p>
                            </div>
                            {selectedGlider && (
                              <p className="text-xs text-muted-foreground">
                                (Limit: {selectedGlider.limits.front_centering}-{selectedGlider.limits.rear_centering} mm)
                              </p>
                            )}
                          </div>
                        )
                      })()}

                      <div className="space-y-2 sm:border-r sm:border-border/40 sm:pr-4 sm:pl-4 text-center">
                        {(() => {
                          const massePassed = selectedGlider && calcMutation.data.total_weight <= selectedGlider.limits.mmwp
                          return (
                            <>
                              <p className="text-xs text-muted-foreground">Masse totale (kg)</p>
                              <p className={`font-mono text-2xl font-bold ${massePassed ? 'text-green-500' : 'text-red-500'}`}>
                                {calcMutation.data.total_weight.toFixed(1)} kg
                              </p>
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${massePassed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                  {massePassed ? (
                                    <span className="text-xs text-green-500">✓</span>
                                  ) : (
                                    <X size={14} className="text-red-500" />
                                  )}
                                </div>
                                <p className={`text-xs font-semibold ${massePassed ? 'text-green-500' : 'text-red-500'}`}>
                                  {massePassed ? 'Pass' : 'Failed'}
                                </p>
                              </div>
                              {selectedGlider && (
                                <p className="text-xs text-muted-foreground">
                                  (Max: {selectedGlider.limits.mmwp} kg)
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>

                      <div className="space-y-2 sm:pl-4 text-center">
                        {(() => {
                          const mvenp = gliderLimitsQuery.data?.mvenp ?? 0;
                          const rearBallast = payload.rear_ballast_weight || 0;
                          const frontBallast = payload.front_ballast_weight || 0;
                          const pilots = (payload.front_pilot_weight || 0) + (payload.rear_pilot_weight || 0);
                          const enpMass = mvenp + pilots + rearBallast + frontBallast;
                          const enpMassPassed = selectedGlider && enpMass <= selectedGlider.limits.mmenp;
                          return (
                            <>
                              <p className="text-xs text-muted-foreground">Masse éléments non portants + occupants + gueuse & water ballast arrière</p>
                              <p className={`font-mono text-2xl font-bold ${enpMassPassed ? 'text-green-500' : 'text-red-500'}`}>
                                {enpMass.toFixed(1)} kg
                              </p>
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${enpMassPassed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                  {enpMassPassed ? (
                                    <span className="text-xs text-green-500">✓</span>
                                  ) : (
                                    <X size={14} className="text-red-500" />
                                  )}
                                </div>
                                <p className={`text-xs font-semibold ${enpMassPassed ? 'text-green-500' : 'text-red-500'}`}>
                                  {enpMassPassed ? 'Pass' : 'Failed'}
                                </p>
                              </div>
                              {selectedGlider && (
                                <p className="text-xs text-muted-foreground">
                                  (Max: {selectedGlider.limits.mmenp} kg)
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="limites">
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Limites de masse et bras de leviers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-4">
                      <section className="space-y-2">
                        <h3 className="text-lg text-foreground">Limitations de masse</h3>
                        <Card className="border-border/60 bg-card/80">
                          <CardContent className="space-y-4 px-4 py-4">
                            {MASS_LIMIT_FIELDS.map(({ key, label }) => (
                              <div key={key} className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{label}</Label>
                                <Input value={String(selectedGlider.limits[key] ?? '—')} readOnly className="bg-input/50 font-mono" />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </section>

                      <section className="space-y-2">
                        <h3 className="text-lg text-foreground">Limites de centrage</h3>
                        <Card className="border-border/60 bg-card/80">
                          <CardContent className="space-y-4 px-4 py-4">
                            {CENTERING_LIMIT_FIELDS.map(({ key, label }) => (
                              <div key={key} className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{label}</Label>
                                <Input value={String(selectedGlider.limits[key] ?? '—')} readOnly className="bg-input/50 font-mono" />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </section>
                    </div>

                    <section className="space-y-2">
                      <h3 className="text-lg text-foreground">Bras de leviers</h3>
                      <Card className="border-border/60 bg-card/80">
                        <CardContent className="space-y-4 px-4 py-4">
                          {ARM_FIELDS.map(({ key, label }) => (
                            <div key={key} className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">{label}</Label>
                              <Input value={String(selectedGlider.arms[key] ?? '—')} readOnly className="bg-input/50 font-mono" />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </section>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator className="my-2 bg-border/40" />
        </>
      )}
    </div>
  )
}
