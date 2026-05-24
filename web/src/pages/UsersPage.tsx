import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiError, backend } from '../lib/api'
import type { User } from '../lib/types'

const EMPTY_USER: User = {
  username: '',
  email: '',
  password: '',
  role: 'viewer',
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [selectedUsername, setSelectedUsername] = useState('')
  const [draft, setDraft] = useState<User>(EMPTY_USER)
  const [newMode, setNewMode] = useState(false)

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => backend.getUsers(),
  })

  const selectedUser = useMemo(
    () => usersQuery.data?.find((item) => item.username === selectedUsername) ?? null,
    [usersQuery.data, selectedUsername],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (newMode) {
        return backend.createUser(draft)
      }
      return backend.updateUser(selectedUsername, draft)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setNewMode(false)
      setSelectedUsername(draft.username)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => backend.deleteUser(selectedUsername),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setSelectedUsername('')
      setDraft(EMPTY_USER)
      setNewMode(false)
    },
  })

  const exportMutation = useMutation({
    mutationFn: () => backend.exportDatabase(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'exported_db.zip'
      link.click()
      URL.revokeObjectURL(url)
    },
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => backend.importDatabase(file),
    onSuccess: () => alert('Base de données importée'),
  })

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white">Utilisateurs</h2>
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          value={selectedUsername}
          onChange={(event) => {
            const username = event.target.value
            setSelectedUsername(username)
            const next = usersQuery.data?.find((item) => item.username === username)
            if (next) {
              setDraft({ ...next, password: '' })
              setNewMode(false)
            }
          }}
        >
          <option value="">Sélectionner...</option>
          {usersQuery.data?.map((item) => (
            <option key={item.username} value={item.username}>
              {item.username} ({item.role})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-md border border-white/30 px-3 py-2 text-sm"
          onClick={() => {
            setNewMode(true)
            setDraft(EMPTY_USER)
            setSelectedUsername('')
          }}
        >
          Nouveau
        </button>
        <button
          type="button"
          className="rounded-md border border-emerald-300 bg-emerald-500/20 px-3 py-2 text-sm"
          onClick={() => saveMutation.mutate()}
        >
          Enregistrer
        </button>
        <button
          type="button"
          className="rounded-md border border-red-300 bg-red-500/20 px-3 py-2 text-sm"
          onClick={() => deleteMutation.mutate()}
          disabled={!selectedUsername}
        >
          Supprimer
        </button>
      </div>
      {selectedUser ? <p className="text-xs text-blue-100">Utilisateur sélectionné: {selectedUser.username}</p> : null}

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Identifiant
          <input
            value={draft.username}
            onChange={(event) => setDraft((prev) => ({ ...prev, username: event.target.value }))}
            className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            value={draft.email}
            onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
            className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Mot de passe
          <input
            value={draft.password ?? ''}
            onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
            className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rôle
          <select
            value={draft.role}
            onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value as User['role'] }))}
            className="rounded-md border border-white/20 bg-black/20 px-3 py-2"
          >
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="administrator">administrator</option>
          </select>
        </label>
      </div>

      <h3 className="text-lg font-semibold">Administration</h3>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-white/30 px-3 py-2 text-sm"
          onClick={() => exportMutation.mutate()}
        >
          Exporter la base
        </button>
        <label className="rounded-md border border-white/30 px-3 py-2 text-sm">
          Importer la base
          <input
            type="file"
            accept=".zip"
            className="ml-2 text-xs"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) importMutation.mutate(file)
            }}
          />
        </label>
      </div>
      {saveMutation.error ? <p className="text-sm text-red-300">{apiError(saveMutation.error)}</p> : null}
      {deleteMutation.error ? <p className="text-sm text-red-300">{apiError(deleteMutation.error)}</p> : null}
      {exportMutation.error ? <p className="text-sm text-red-300">{apiError(exportMutation.error)}</p> : null}
      {importMutation.error ? <p className="text-sm text-red-300">{apiError(importMutation.error)}</p> : null}
    </section>
  )
}
