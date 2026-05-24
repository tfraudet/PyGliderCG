import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlaneTakeoff, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiError, backend } from '@/lib/api'
import { EMPTY_GLIDER, type Glider, type Instrument } from '@/lib/types'

function cloneGlider(glider: Glider): Glider {
  return JSON.parse(JSON.stringify(glider)) as Glider
}

const LIMIT_LABELS: Record<string, string> = {
  mve: 'MVE (kg)', mvenp: 'MVENP (kg)', cu_max: 'CU max (mm)',
  cu_min: 'CU min (mm)', cu_solo: 'CU solo (mm)',
}
const ARM_LABELS: Record<string, string> = {
  front_pilot_arm: 'Bras pilote avant (mm)', rear_pilot_arm: 'Bras pilote arrière (mm)',
  front_ballast_arm: 'Bras ballast avant (mm)', rear_ballast_arm: 'Bras ballast arrière (mm)',
  wing_water_ballast_arm: 'Bras ballast eau (mm)',
}

export function GlidersPage() {
  const queryClient = useQueryClient()
  const [selectedRegistration, setSelectedRegistration] = useState('')
  const [draft, setDraft] = useState<Glider>(cloneGlider(EMPTY_GLIDER))
  const [newMode, setNewMode] = useState(false)

  const glidersQuery = useQuery({
    queryKey: ['gliders'],
    queryFn: () => backend.getGliders(),
  })

  const selectedGlider = useMemo(
    () => glidersQuery.data?.find((item) => item.registration === selectedRegistration) ?? null,
    [glidersQuery.data, selectedRegistration],
  )

  const saveMutation = useMutation({
    mutationFn: async () =>
      newMode ? backend.createGlider(draft) : backend.updateGlider(selectedRegistration, draft),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['gliders'] })
      setSelectedRegistration(saved.registration)
      setDraft(cloneGlider(saved))
      setNewMode(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => backend.deleteGlider(selectedRegistration),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gliders'] })
      setDraft(cloneGlider(EMPTY_GLIDER))
      setSelectedRegistration('')
      setNewMode(false)
    },
  })

  const saveInventory = useMutation({
    mutationFn: async () => backend.updateGliderInstruments(draft.registration, draft.instruments),
  })

  const saveWeightBalances = useMutation({
    mutationFn: async () =>
      backend.updateWeightBalances(draft.registration, draft.weight_and_balances),
  })

  const hasSelection = newMode || Boolean(selectedRegistration)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <PlaneTakeoff size={22} className="text-primary" strokeWidth={1.8} />
        <h1
          className="text-xl font-bold text-foreground"
        >
          Gestion des planeurs
        </h1>
      </div>

      {/* Toolbar */}
      <Card className="border-border/60 bg-card/80">
        <CardContent className="flex flex-wrap items-center gap-2 px-4 py-3">
          <Select
            value={selectedRegistration}
            onValueChange={(value: string | null) => {
              if (!value) return
              setSelectedRegistration(value)
              const found = glidersQuery.data?.find((item) => item.registration === value)
              if (found) { setDraft(cloneGlider(found)); setNewMode(false) }
            }}
          >
            <SelectTrigger className="w-56 bg-input/50">
              <SelectValue placeholder="Sélectionner un planeur…" />
            </SelectTrigger>
            <SelectContent>
              {glidersQuery.data?.map((item) => (
                <SelectItem key={item.registration} value={item.registration}>
                  {item.registration} — {item.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => { setDraft(cloneGlider(EMPTY_GLIDER)); setNewMode(true); setSelectedRegistration('') }}
          >
            <Plus size={14} /> Nouveau
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => saveMutation.mutate()}
            disabled={!hasSelection || saveMutation.isPending}
          >
            <Save size={14} /> Enregistrer
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => deleteMutation.mutate()}
            disabled={!selectedRegistration || deleteMutation.isPending}
          >
            <Trash2 size={14} /> Supprimer
          </Button>
        </CardContent>
      </Card>

      {(saveMutation.error || deleteMutation.error) && (
        <Alert variant="destructive">
          <AlertDescription>
            {apiError(saveMutation.error ?? deleteMutation.error)}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      {hasSelection && (
        <Tabs defaultValue="fiche">
          <TabsList className="bg-muted/40 border border-border/40">
            <TabsTrigger value="fiche">Fiche</TabsTrigger>
            <TabsTrigger value="limites">Limites &amp; Bras</TabsTrigger>
            <TabsTrigger value="inventaire">Inventaire</TabsTrigger>
            <TabsTrigger value="wb">Masse / Centrage</TabsTrigger>
          </TabsList>

          {/* ── Fiche ── */}
          <TabsContent value="fiche">
            <Card className="border-border/60 bg-card/80">
              <CardContent className="grid gap-4 px-4 py-4 sm:grid-cols-2">
                {[
                  { key: 'registration' as keyof Glider, label: 'Immatriculation' },
                  { key: 'model' as keyof Glider,        label: 'Modèle' },
                  { key: 'brand' as keyof Glider,        label: 'Marque' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input
                      value={(draft[key] as string) ?? ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="bg-input/50"
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">N° série</Label>
                  <Input
                    type="number"
                    value={draft.serial_number ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        serial_number: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="bg-input/50 font-mono"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Limites & Bras ── */}
          <TabsContent value="limites">
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Limites de masse
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
                {Object.entries(draft.limits).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{LIMIT_LABELS[key] ?? key}</Label>
                    <Input
                      type="number"
                      value={value}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, limits: { ...prev.limits, [key]: Number(e.target.value) } }))
                      }
                      className="bg-input/50 font-mono"
                    />
                  </div>
                ))}
              </CardContent>
              <CardHeader className="pb-2 pt-2 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bras de leviers
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
                {Object.entries(draft.arms).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{ARM_LABELS[key] ?? key}</Label>
                    <Input
                      type="number"
                      value={Number(value ?? 0)}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, arms: { ...prev.arms, [key]: Number(e.target.value) } }))
                      }
                      className="bg-input/50 font-mono"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Inventaire ── */}
          <TabsContent value="inventaire">
            <Card className="border-border/60 bg-card/80">
              <CardContent className="px-4 py-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead className="text-xs">Instrument</TableHead>
                        <TableHead className="text-xs">Marque</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">N°</TableHead>
                        <TableHead className="text-xs">Siège</TableHead>
                        <TableHead className="text-xs text-center">Installé</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draft.instruments.map((instrument, index) => (
                        <InstrumentRow
                          key={`${instrument.id ?? 'new'}-${index}`}
                          value={instrument}
                          onChange={(next) =>
                            setDraft((prev) => ({
                              ...prev,
                              instruments: prev.instruments.map((row, i) => (i === index ? next : row)),
                            }))
                          }
                          onDelete={() =>
                            setDraft((prev) => ({
                              ...prev,
                              instruments: prev.instruments.filter((_, i) => i !== index),
                            }))
                          }
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        instruments: [
                          ...prev.instruments,
                          { on_board: false, instrument: '', brand: '', type: '', number: '', seat: '', date: null },
                        ],
                      }))
                    }
                  >
                    <Plus size={13} /> Ajouter ligne
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => saveInventory.mutate()}
                    disabled={!draft.registration || saveInventory.isPending}
                  >
                    <Save size={13} /> Enregistrer inventaire
                  </Button>
                </div>
                {saveInventory.error && (
                  <p className="mt-2 text-xs text-destructive">{apiError(saveInventory.error)}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Masse / Centrage ── */}
          <TabsContent value="wb">
            <Card className="border-border/60 bg-card/80">
              <CardContent className="px-4 py-4 space-y-3">
                <div className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-[1fr_1fr_auto]">
                  <span className="font-medium">Masse (kg)</span>
                  <span className="font-medium">Centrage (mm)</span>
                  <span />
                </div>
                {draft.weight_and_balances.map((pair, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <Input
                      type="number"
                      value={pair[0]}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          weight_and_balances: prev.weight_and_balances.map((item, i) =>
                            i === index ? [Number(e.target.value), item[1]] : item,
                          ),
                        }))
                      }
                      className="bg-input/50 font-mono"
                    />
                    <Input
                      type="number"
                      value={pair[1]}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          weight_and_balances: prev.weight_and_balances.map((item, i) =>
                            i === index ? [item[0], Number(e.target.value)] : item,
                          ),
                        }))
                      }
                      className="bg-input/50 font-mono"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          weight_and_balances: prev.weight_and_balances.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        weight_and_balances: [...prev.weight_and_balances, [0, 0]],
                      }))
                    }
                  >
                    <Plus size={13} /> Ajouter point
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => saveWeightBalances.mutate()}
                    disabled={!draft.registration || saveWeightBalances.isPending}
                  >
                    <Save size={13} /> Enregistrer points
                  </Button>
                </div>
                {saveWeightBalances.error && (
                  <p className="text-xs text-destructive">{apiError(saveWeightBalances.error)}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {selectedGlider && (
        <p className="text-xs text-muted-foreground">
          Dernière pesée : {selectedGlider.weighings.at(-1)?.date ?? 'aucune'}
        </p>
      )}
    </div>
  )
}

function InstrumentRow({
  value, onChange, onDelete,
}: { value: Instrument; onChange: (next: Instrument) => void; onDelete: () => void }) {
  return (
    <TableRow className="border-border/30 hover:bg-muted/20">
      {(['instrument', 'brand', 'type', 'number', 'seat'] as const).map((field) => (
        <TableCell key={field} className="py-1.5 px-2">
          <Input
            value={value[field]}
            onChange={(e) => onChange({ ...value, [field]: e.target.value })}
            className="h-7 bg-input/40 text-xs"
          />
        </TableCell>
      ))}
      <TableCell className="py-1.5 px-2 text-center">
        <input
          type="checkbox"
          checked={value.on_board}
          onChange={(e) => onChange({ ...value, on_board: e.target.checked })}
          className="accent-primary h-4 w-4 cursor-pointer"
        />
      </TableCell>
      <TableCell className="py-1.5 px-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 size={12} />
        </Button>
      </TableCell>
    </TableRow>
  )
}


