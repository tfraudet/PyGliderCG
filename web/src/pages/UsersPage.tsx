import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Database, Eye, MoreHorizontal, Pencil, Plus, Save, Trash2, Upload, Users } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiError, backend } from '@/lib/api'
import type { User } from '@/lib/types'

const EMPTY_USER: User = { username: '', email: '', password: '', role: 'viewer' }

type DialogMode = 'create' | 'view' | 'edit' | null

const ROLE_VARIANT: Record<User['role'], 'default' | 'secondary' | 'outline'> = {
  administrator: 'default',
  editor: 'secondary',
  viewer: 'outline',
}

const ROLE_OPTIONS: User['role'][] = ['viewer', 'editor', 'administrator']

function makeDraft(user: User): User {
  return { ...user, password: '' }
}

function isChecked(value: boolean | 'indeterminate') {
  return value === true
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [activeUsername, setActiveUsername] = useState('')
  const [draft, setDraft] = useState<User>(EMPTY_USER)
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([])

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => backend.getUsers(),
  })

  const users = usersQuery.data ?? []
  const allSelected = users.length > 0 && selectedUsernames.length === users.length
  const isCreateMode = dialogMode === 'create'
  const isEditMode = dialogMode === 'edit'
  const isViewMode = dialogMode === 'view'

  const saveMutation = useMutation({
    mutationFn: async () => (
      isCreateMode
        ? backend.createUser(draft)
        : backend.updateUser(activeUsername, draft)
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setDialogMode(null)
      setActiveUsername('')
      setDraft(EMPTY_USER)
    },
  })

  const deleteUsersMutation = useMutation({
    mutationFn: async (usernames: string[]) => {
      await Promise.all(usernames.map((username) => backend.deleteUser(username)))
    },
    onSuccess: async (_, usernames) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setSelectedUsernames((previous) => previous.filter((username) => !usernames.includes(username)))
      if (usernames.includes(activeUsername)) {
        setDialogMode(null)
        setActiveUsername('')
        setDraft(EMPTY_USER)
      }
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
  })

  const anyError = saveMutation.error
    ?? deleteUsersMutation.error
    ?? exportMutation.error
    ?? importMutation.error

  useEffect(() => {
    const usernames = new Set(users.map((user) => user.username))
    setSelectedUsernames((previous) => previous.filter((username) => usernames.has(username)))
  }, [users])

  const selectedCount = selectedUsernames.length
  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => left.username.localeCompare(right.username, 'fr', { sensitivity: 'base' })),
    [users],
  )

  const openCreateDialog = () => {
    setDialogMode('create')
    setActiveUsername('')
    setDraft(EMPTY_USER)
  }

  const openViewDialog = (user: User) => {
    setDialogMode('view')
    setActiveUsername(user.username)
    setDraft(makeDraft(user))
  }

  const openEditDialog = (user: User) => {
    setDialogMode('edit')
    setActiveUsername(user.username)
    setDraft(makeDraft(user))
  }

  const closeDialog = () => {
    setDialogMode(null)
    setActiveUsername('')
    setDraft(EMPTY_USER)
  }

  const toggleUserSelection = (username: string, checked: boolean | 'indeterminate') => {
    setSelectedUsernames((previous) => (
      isChecked(checked)
        ? previous.includes(username)
          ? previous
          : [...previous, username]
        : previous.filter((value) => value !== username)
    ))
  }

  const toggleAllSelection = (checked: boolean | 'indeterminate') => {
    setSelectedUsernames(isChecked(checked) ? users.map((user) => user.username) : [])
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Users size={22} className="text-primary" strokeWidth={1.8} />
        <h1 className="text-xl font-bold text-foreground">Liste des utilisateurs</h1>
        <Badge variant="secondary">{users.length}</Badge>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader className="flex flex-col gap-3 px-4 pt-4 pb-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            Utilisateurs
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteUsersMutation.mutate(selectedUsernames)}
              disabled={deleteUsersMutation.isPending || selectedCount === 0}
            >
              <Trash2 data-icon="inline-start" />
              {deleteUsersMutation.isPending ? 'Suppression…' : `Supprimer la sélection${selectedCount ? ` (${selectedCount})` : ''}`}
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus data-icon="inline-start" />
              Ajouter un utilisateur
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Sélectionner tous les utilisateurs"
                    checked={allSelected}
                    onCheckedChange={toggleAllSelection}
                  />
                </TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mot de passe</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="w-14 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Aucun utilisateur trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user) => {
                  const isSelected = selectedUsernames.includes(user.username)
                  return (
                    <TableRow key={user.username} data-state={isSelected ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Sélectionner ${user.username}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => toggleUserSelection(user.username, checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="max-w-56 whitespace-normal break-all text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="max-w-80 whitespace-normal break-all font-mono text-xs text-muted-foreground">
                        {user.password ? `${user.password.substring(0, 24)}…` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANT[user.role]}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={(
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions pour ${user.username}`}
                              />
                            )}
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => openViewDialog(user)}>
                                <Eye />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Pencil />
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => deleteUsersMutation.mutate([user.username])}
                              >
                                <Trash2 />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator className="bg-border/80" />

      <Card className="border-border/60 bg-card/80">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Database />
            Administration base de données
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 px-4 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <Database data-icon="inline-start" />
            {exportMutation.isPending ? 'Export…' : 'Exporter la base'}
          </Button>
          <Label
            htmlFor="import-db"
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            <Upload />
            Importer la base
            <Input
              id="import-db"
              type="file"
              accept=".zip"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) importMutation.mutate(file)
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

      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCreateMode ? 'Nouvel utilisateur' : isEditMode ? `Modifier ${activeUsername}` : `Voir ${activeUsername}`}
            </DialogTitle>
            <DialogDescription>
              {isCreateMode
                ? 'Créer un nouveau compte utilisateur.'
                : isEditMode
                  ? 'Modifier les informations du compte sélectionné.'
                  : 'Consulter les informations du compte sélectionné.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Identifiant</Label>
              <Input
                value={draft.username}
                readOnly={isViewMode}
                onChange={(event) => setDraft((previous) => ({ ...previous, username: event.target.value }))}
                className="bg-input/50"
                placeholder="ex: jdoe"
                disabled={!isCreateMode}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={draft.email}
                readOnly={isViewMode}
                onChange={(event) => setDraft((previous) => ({ ...previous, email: event.target.value }))}
                className="bg-input/50"
                placeholder="ex: john@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Mot de passe</Label>
              <Input
                type={isViewMode ? 'text' : 'password'}
                value={draft.password ?? ''}
                readOnly={isViewMode}
                onChange={(event) => setDraft((previous) => ({ ...previous, password: event.target.value }))}
                className="bg-input/50"
                placeholder={isCreateMode ? 'Mot de passe' : isEditMode ? 'Laisser vide pour ne pas changer' : '—'}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Rôle</Label>
              {isViewMode ? (
                <div className="flex min-h-8 items-center">
                  <Badge variant={ROLE_VARIANT[draft.role]}>{draft.role}</Badge>
                </div>
              ) : (
                <Select
                  value={draft.role}
                  onValueChange={(value: string | null) => {
                    setDraft((previous) => ({ ...previous, role: (value ?? 'viewer') as User['role'] }))
                  }}
                >
                  <SelectTrigger className="bg-input/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {!isViewMode && (
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !draft.username || !draft.email || (isCreateMode && !draft.password)}
              >
                <Save data-icon="inline-start" />
                {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
