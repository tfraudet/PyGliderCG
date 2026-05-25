import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Save, Trash2, Database, Upload, ArrowUpDown } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { DataTable } from '@/components/DataTable'
import { apiError, backend } from '@/lib/api'
import type { User } from '@/lib/types'

const EMPTY_USER: User = { username: '', email: '', password: '', role: 'viewer' }

const ROLE_BADGE: Record<string, string> = {
  administrator: 'bg-primary/10 text-primary border-primary/30',
  editor:        'bg-secondary text-secondary-foreground border-border',
  viewer:        'bg-muted text-muted-foreground border-border',
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

  const saveMutation = useMutation({
    mutationFn: async () =>
      newMode ? backend.createUser(draft) : backend.updateUser(selectedUsername, draft),
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
      const a = document.createElement('a')
      a.href = url; a.download = 'exported_db.zip'; a.click()
      URL.revokeObjectURL(url)
    },
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => backend.importDatabase(file),
  })

  const anyError = saveMutation.error ?? deleteMutation.error ?? exportMutation.error ?? importMutation.error

  // Define columns for the data table
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 font-semibold hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Identifiant
          {column.getIsSorted() && (
            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <span
          className="cursor-pointer hover:underline"
          onClick={() => {
            setSelectedUsername(row.original.username)
            setDraft({ ...row.original, password: '' })
            setNewMode(false)
          }}
        >
          {row.getValue('username')}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 font-semibold hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          eMail
          {column.getIsSorted() && (
            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
          )}
        </Button>
      ),
      cell: ({ row }) => <div className="break-all">{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'password',
      header: 'Mot de passe',
      cell: ({ row }) => {
        const pwd = row.getValue('password') as string
        return (
          <span className="font-mono text-xs text-muted-foreground break-all">
            {pwd ? `${pwd.substring(0, 20)}…` : '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'role',
      header: 'Rôle',
      cell: ({ row }) => (
        <Badge variant="outline" className={`text-xs ${ROLE_BADGE[row.getValue('role') as string]}`}>
          {row.getValue('role')}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Users size={22} className="text-primary" strokeWidth={1.8} />
        <h1 className="text-xl font-bold text-foreground">Liste des utilisateurs</h1>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardContent className="px-4 py-4">
          <DataTable
            columns={columns}
            data={usersQuery.data ?? []}
            filterColumn="username"
            filterPlaceholder="Filtrer par identifiant…"
          />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            {newMode ? 'Nouvel utilisateur' : 'Éditer l\'utilisateur'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Identifiant</Label>
              <Input
                value={draft.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({ ...prev, username: e.target.value }))}
                className="bg-input/50"
                placeholder="ex: jdoe"
                disabled={!newMode && selectedUsername !== ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={draft.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-input/50"
                placeholder="ex: john@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mot de passe</Label>
              <Input
                type="password"
                value={draft.password ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({ ...prev, password: e.target.value }))}
                className="bg-input/50"
                placeholder={newMode ? 'Mot de passe' : 'Laisser vide pour ne pas changer'}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Rôle</Label>
              <Select
                value={draft.role}
                onValueChange={(v: string | null) =>
                  setDraft((prev) => ({ ...prev, role: (v ?? 'viewer') as User['role'] }))}
              >
                <SelectTrigger className="bg-input/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">viewer</SelectItem>
                  <SelectItem value="editor">editor</SelectItem>
                  <SelectItem value="administrator">administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm" className="gap-1.5"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !draft.username || (newMode && !draft.password)}
            >
              <Save size={14} /> Enregistrer
            </Button>
            {selectedUsername && (
              <Button
                variant="destructive" size="sm" className="gap-1.5"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={14} /> Supprimer
              </Button>
            )}
            <Button
              variant="outline" size="sm" className="gap-1.5"
              onClick={() => { setNewMode(true); setDraft(EMPTY_USER); setSelectedUsername('') }}
            >
              <Plus size={14} /> Nouveau
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-border/40" />

      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Database size={13} /> Administration base de données
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 px-4 pb-4">
          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <Database size={14} />
            {exportMutation.isPending ? 'Export…' : 'Exporter la base'}
          </Button>
          <Label
            htmlFor="import-db"
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <Upload size={14} /> Importer la base
            <Input
              id="import-db"
              type="file"
              accept=".zip"
              className="sr-only"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const f = e.target.files?.[0]
                if (f) importMutation.mutate(f)
              }}
            />
          </Label>
        </CardContent>
      </Card>

      {anyError && (
        <Alert variant="destructive">
          <AlertDescription>{apiError(anyError)}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
