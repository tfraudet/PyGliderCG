import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiError, backend } from '../lib/api'
import type { Weighing } from '../lib/types'

const EMPTY_WEIGHING: Weighing = {
  date: new Date().toISOString().slice(0, 10),
  p1: 0,
  p2: 0,
  A: 0,
  D: 0,
  right_wing_weight: 0,
  left_wing_weight: 0,
  tail_weight: 0,
  fuselage_weight: 0,
  fix_ballast_weight: 0,
}

export function WeighingsPage() {
  const queryClient = useQueryClient()
  const [selectedRegistration, setSelectedRegistration] = useState('')
  const [draft, setDraft] = useState<Weighing>({ ...EMPTY_WEIGHING })

  const glidersQuery = useQuery({
    queryKey: ['gliders'],
    queryFn: () => backend.getGliders(),
  })

  const selectedGlider = useMemo(
    () => glidersQuery.data?.find((item) => item.registration === selectedRegistration) ?? null,
    [glidersQuery.data, selectedRegistration],
  )

  const addMutation = useMutation({
    mutationFn: async () => backend.addWeighings(selectedRegistration, [draft]),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gliders'] })
      setDraft({ ...EMPTY_WEIGHING })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (weighingId: number) => backend.deleteWeighing(selectedRegistration, weighingId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gliders'] })
    },
  })

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white">Pesées</h2>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Choisir un planeur</span>
        <select
          className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          value={selectedRegistration}
          onChange={(event) => setSelectedRegistration(event.target.value)}
        >
          <option value="">Sélectionner...</option>
          {glidersQuery.data?.map((item) => (
            <option key={item.registration} value={item.registration}>
              {item.registration}
            </option>
          ))}
        </select>
      </label>
      {selectedGlider ? (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>ID</th>
                <th>Date</th>
                <th>p1</th>
                <th>p2</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {selectedGlider.weighings.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.date}</td>
                  <td>{item.p1}</td>
                  <td>{item.p2}</td>
                  <td>
                    {item.id ? (
                      <button
                        type="button"
                        className="rounded border border-red-300 px-2 py-1 text-xs"
                        onClick={() => deleteMutation.mutate(item.id!)}
                      >
                        Supprimer
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-lg font-semibold">Ajouter une pesée</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(draft).map(([key, value]) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                {key}
                <input
                  type={key === 'date' ? 'date' : 'number'}
                  value={value as string | number}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      [key]: key === 'date' ? event.target.value : Number(event.target.value),
                    }))
                  }
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className="rounded-md border border-emerald-300 bg-emerald-500/20 px-3 py-2 text-sm"
            onClick={() => addMutation.mutate()}
          >
            Enregistrer
          </button>
          {addMutation.error ? <p className="text-sm text-red-300">{apiError(addMutation.error)}</p> : null}
          {deleteMutation.error ? <p className="text-sm text-red-300">{apiError(deleteMutation.error)}</p> : null}
        </>
      ) : null}
    </section>
  )
}
