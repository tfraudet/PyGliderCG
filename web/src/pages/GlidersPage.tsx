import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiError, backend } from '../lib/api'
import { EMPTY_GLIDER, type Glider, type Instrument } from '../lib/types'

function cloneGlider(glider: Glider): Glider {
  return JSON.parse(JSON.stringify(glider)) as Glider
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
    mutationFn: async () => {
      if (newMode) {
        return backend.createGlider(draft)
      }
      return backend.updateGlider(selectedRegistration, draft)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['gliders'] })
      setSelectedRegistration(saved.registration)
      setDraft(cloneGlider(saved))
      setNewMode(false)
      alert('Planeur sauvegardé')
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
    onSuccess: () => alert('Inventaire mis à jour'),
  })

  const saveWeightBalances = useMutation({
    mutationFn: async () => backend.updateWeightBalances(draft.registration, draft.weight_and_balances),
    onSuccess: () => alert('Points masse/centrage mis à jour'),
  })

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white">Gestion des planeurs</h2>
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          value={selectedRegistration}
          onChange={(event) => {
            const value = event.target.value
            setSelectedRegistration(value)
            const found = glidersQuery.data?.find((item) => item.registration === value)
            if (found) {
              setDraft(cloneGlider(found))
              setNewMode(false)
            }
          }}
        >
          <option value="">Sélectionner un planeur...</option>
          {glidersQuery.data?.map((item) => (
            <option key={item.registration} value={item.registration}>
              {item.registration} — {item.model}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-md border border-white/30 px-3 py-2 text-sm"
          onClick={() => {
            setDraft(cloneGlider(EMPTY_GLIDER))
            setNewMode(true)
            setSelectedRegistration('')
          }}
        >
          Ajouter
        </button>
        <button
          type="button"
          className="rounded-md border border-emerald-300 bg-emerald-500/20 px-3 py-2 text-sm"
          onClick={() => saveMutation.mutate()}
          disabled={!newMode && !selectedRegistration}
        >
          Enregistrer fiche
        </button>
        <button
          type="button"
          className="rounded-md border border-red-400 bg-red-500/20 px-3 py-2 text-sm"
          onClick={() => deleteMutation.mutate()}
          disabled={!selectedRegistration}
        >
          Supprimer
        </button>
      </div>
      {saveMutation.error ? <p className="text-sm text-red-300">{apiError(saveMutation.error)}</p> : null}
      {deleteMutation.error ? <p className="text-sm text-red-300">{apiError(deleteMutation.error)}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Immatriculation
          <input
            value={draft.registration}
            onChange={(event) => setDraft((prev) => ({ ...prev, registration: event.target.value }))}
            className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Modèle
          <input
            value={draft.model}
            onChange={(event) => setDraft((prev) => ({ ...prev, model: event.target.value }))}
            className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Marque
          <input
            value={draft.brand}
            onChange={(event) => setDraft((prev) => ({ ...prev, brand: event.target.value }))}
            className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          N° série
          <input
            type="number"
            value={draft.serial_number ?? ''}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                serial_number: event.target.value ? Number(event.target.value) : null,
              }))
            }
            className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          />
        </label>
      </div>

      <details className="rounded-md border border-white/20 p-3">
        <summary className="cursor-pointer font-semibold">Limites et bras de leviers</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {Object.entries(draft.limits).map(([key, value]) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              {key}
              <input
                type="number"
                value={value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    limits: {
                      ...prev.limits,
                      [key]: Number(event.target.value),
                    },
                  }))
                }
                className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
              />
            </label>
          ))}
          {Object.entries(draft.arms).map(([key, value]) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              {key}
              <input
                type="number"
                value={Number(value ?? 0)}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    arms: {
                      ...prev.arms,
                      [key]: Number(event.target.value),
                    },
                  }))
                }
                className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
              />
            </label>
          ))}
        </div>
      </details>

      <details className="rounded-md border border-white/20 p-3">
        <summary className="cursor-pointer font-semibold">Inventaire</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Instrument</th>
                <th>Marque</th>
                <th>Type</th>
                <th>N°</th>
                <th>Siège</th>
                <th>Installé</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {draft.instruments.map((instrument, index) => (
                <InstrumentRow
                  key={`${instrument.id ?? 'new'}-${index}`}
                  value={instrument}
                  onChange={(next) =>
                    setDraft((prev) => ({
                      ...prev,
                      instruments: prev.instruments.map((row, rowIndex) => (rowIndex === index ? next : row)),
                    }))
                  }
                  onDelete={() =>
                    setDraft((prev) => ({
                      ...prev,
                      instruments: prev.instruments.filter((_, rowIndex) => rowIndex !== index),
                    }))
                  }
                />
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-md border border-white/30 px-3 py-2 text-sm"
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
              Ajouter ligne
            </button>
            <button
              type="button"
              className="rounded-md border border-emerald-300 bg-emerald-500/20 px-3 py-2 text-sm"
              onClick={() => saveInventory.mutate()}
              disabled={!draft.registration}
            >
              Enregistrer inventaire
            </button>
          </div>
          {saveInventory.error ? <p className="mt-2 text-sm text-red-300">{apiError(saveInventory.error)}</p> : null}
        </div>
      </details>

      <details className="rounded-md border border-white/20 p-3">
        <summary className="cursor-pointer font-semibold">Masse / centrage</summary>
        <div className="mt-3 space-y-2">
          {draft.weight_and_balances.map((pair, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input
                type="number"
                value={pair[0]}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    weight_and_balances: prev.weight_and_balances.map((item, itemIndex) =>
                      itemIndex === index ? [Number(event.target.value), item[1]] : item,
                    ),
                  }))
                }
                className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
              />
              <input
                type="number"
                value={pair[1]}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    weight_and_balances: prev.weight_and_balances.map((item, itemIndex) =>
                      itemIndex === index ? [item[0], Number(event.target.value)] : item,
                    ),
                  }))
                }
                className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
              />
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    weight_and_balances: prev.weight_and_balances.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
                className="rounded-md border border-red-300 px-3 py-2 text-sm"
              >
                Suppr
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-white/30 px-3 py-2 text-sm"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  weight_and_balances: [...prev.weight_and_balances, [0, 0]],
                }))
              }
            >
              Ajouter point
            </button>
            <button
              type="button"
              className="rounded-md border border-emerald-300 bg-emerald-500/20 px-3 py-2 text-sm"
              onClick={() => saveWeightBalances.mutate()}
              disabled={!draft.registration}
            >
              Enregistrer points
            </button>
          </div>
          {saveWeightBalances.error ? (
            <p className="text-sm text-red-300">{apiError(saveWeightBalances.error)}</p>
          ) : null}
        </div>
      </details>

      {selectedGlider ? (
        <p className="text-xs text-blue-200/90">
          Dernière pesée connue : {selectedGlider.weighings.at(-1)?.date ?? 'aucune'}
        </p>
      ) : null}
    </section>
  )
}

function InstrumentRow({
  value,
  onChange,
  onDelete,
}: {
  value: Instrument
  onChange: (next: Instrument) => void
  onDelete: () => void
}) {
  return (
    <tr>
      <td>
        <input
          value={value.instrument}
          onChange={(event) => onChange({ ...value, instrument: event.target.value })}
          className="w-full rounded border border-white/20 bg-black/20 px-2 py-1"
        />
      </td>
      <td>
        <input
          value={value.brand}
          onChange={(event) => onChange({ ...value, brand: event.target.value })}
          className="w-full rounded border border-white/20 bg-black/20 px-2 py-1"
        />
      </td>
      <td>
        <input
          value={value.type}
          onChange={(event) => onChange({ ...value, type: event.target.value })}
          className="w-full rounded border border-white/20 bg-black/20 px-2 py-1"
        />
      </td>
      <td>
        <input
          value={value.number}
          onChange={(event) => onChange({ ...value, number: event.target.value })}
          className="w-full rounded border border-white/20 bg-black/20 px-2 py-1"
        />
      </td>
      <td>
        <input
          value={value.seat}
          onChange={(event) => onChange({ ...value, seat: event.target.value })}
          className="w-full rounded border border-white/20 bg-black/20 px-2 py-1"
        />
      </td>
      <td className="text-center">
        <input
          type="checkbox"
          checked={value.on_board}
          onChange={(event) => onChange({ ...value, on_board: event.target.checked })}
        />
      </td>
      <td>
        <button type="button" className="rounded border border-red-300 px-2 py-1 text-xs" onClick={onDelete}>
          Suppr
        </button>
      </td>
    </tr>
  )
}
