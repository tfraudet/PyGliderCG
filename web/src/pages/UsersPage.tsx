import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Save, Trash2, Database, Upload } from 'lucide-react'
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

  const selectedUser = useMemo(
    () => usersQuery.data?.find((item) => item.username === selectedUsername) ?? null,
    [usersQuery.data, selectedUsername],
  )

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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Users size={22} className="text-primary" strokeWidth={1.8} />
        <h1
          className="text-xl font-bold text-foreground"
        >
          Utilisateurs
        </h1>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardContent className="flex flex-wrap items-center gap-2 px-4 py-3">
          <Select
            value={selectedUsername}
            onValueChange={(u: string | null) => {
              if (!u) return
              setSelectedUsername(u)
              const next = usersQuery.data?.find((item) => item.username === u)
              if (next) { setDraft({ ...next, password: '' }); setNewMode(false) }
            }}
          >
            <SelectTrigger className="w-56 bg-input/50">
              <SelectValue placeholder="Sélectionner un utilisateur…" />
            </SelectTrigger>
            <SelectContent>
              {usersQuery.data?.map((item) => (
                <SelectItem key={item.username} value={item.username}>
                  <span className="flex items-center gap-2">
                    {item.username}
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ROLE_BADGE[item.role]}`}>
                      {item.role}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedUser && (
            <Badge variant="outline" className={`${ROLE_BADGE[selectedUser.role]}`}>
              {selectedUser.role}
            </Badge>
          )}

          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={() => { setNewMode(true); setDraft(EMPTY_USER); setSelectedUsername('') }}
          >
            <Plus size={14} /> Nouveau
          </Button>
          <Button
            size="sm" className="gap-1.5"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save size={14} /> Enregistrer
          </Button>
          <Button
            variant="destructive" size="sm" className="gap-1.5"
            onClick={() => deleteMutation.mutate()}
            disabled={!selectedUsername || deleteMutation.isPending}
          >
            <Trash2 size={14} /> Supprimer
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardContent className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Identifiant</Label>
            <Input
              value={draft.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({ ...prev, username: e.target.value }))}
              className="bg-input/50"
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
              placeholder="Laisser vide pour ne pas changer"
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
