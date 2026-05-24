import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiError, backend } from '../lib/api'

export function HomePage() {
  const glidersQuery = useQuery({
    queryKey: ['gliders'],
    queryFn: () => backend.getGliders(),
  })
  const [selected, setSelected] = useState('')
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

  const limitsQuery = useQuery({
    queryKey: ['limits', selected],
    queryFn: () => backend.gliderLimits(selected),
    enabled: Boolean(selected),
  })

  const calcMutation = useMutation({
    mutationFn: () => backend.calculateWeightBalance(selected, payload),
  })

  if (glidersQuery.isLoading) {
    return <p>Chargement des planeurs...</p>
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white">Calculateur centrage pilote</h2>
      <p className="rounded-md border border-amber-500/40 bg-amber-400/15 p-3 text-sm text-amber-100">
        Attention : Ce logiciel est un outil d'aide à la décision pour le calcul du centrage.
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Choisir un planeur</span>
        <select
          className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">Sélectionner...</option>
          {glidersQuery.data?.map((glider) => (
            <option key={glider.registration} value={glider.registration}>
              {glider.registration} — {glider.model}
            </option>
          ))}
        </select>
      </label>
      {selectedGlider ? (
        <div className="space-y-4">
          <p className="text-sm text-blue-100">
            {selectedGlider.single_seat ? 'Monoplace' : 'Biplace'} {selectedGlider.registration} —{' '}
            {selectedGlider.model} ({selectedGlider.brand})
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(payload).map(([key, value]) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                <span>{key}</span>
                <input
                  type="number"
                  min={0}
                  value={value}
                  onChange={(event) =>
                    setPayload((prev) => ({
                      ...prev,
                      [key]: Number(event.target.value),
                    }))
                  }
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => calcMutation.mutate()}
            className="rounded-md border border-emerald-300 bg-emerald-500/20 px-3 py-2 text-sm font-semibold"
          >
            Calculer
          </button>
          {calcMutation.error ? (
            <p className="rounded-md border border-red-400/50 bg-red-500/20 p-3 text-sm text-red-200">
              {apiError(calcMutation.error)}
            </p>
          ) : null}
          {calcMutation.data ? (
            <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-3">
              <p>Total masse : {calcMutation.data.total_weight} kg</p>
              <p>Centrage calculé : {calcMutation.data.center_of_gravity} mm</p>
            </div>
          ) : null}
          {limitsQuery.data ? (
            <div className="grid gap-2 text-sm md:grid-cols-3">
              <p className="rounded border border-white/20 p-2">MVE: {limitsQuery.data.mve ?? '-'}</p>
              <p className="rounded border border-white/20 p-2">MVENP: {limitsQuery.data.mvenp ?? '-'}</p>
              <p className="rounded border border-white/20 p-2">CU max: {limitsQuery.data.cu_max ?? '-'}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
