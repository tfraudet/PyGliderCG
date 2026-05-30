import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown, Database, Download, Eye, MoreHorizontal, Pencil, Plus, Save, Trash2, TriangleAlert, Upload, Users } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type DialogMode = 'create' | 'view' | 'edit' | null
type SortKey = 'username' | 'email'
type SortDirection = 'asc' | 'desc'

const ROLE_CLASSNAME: Record<User['role'],string> = {
  administrator: 'bg-purple-50 text-xs font-extralight text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  editor: 'bg-amber-50 text-xs font-extralight text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  viewer: 'bg-green-50 text-xs font-extralight text-green-700 dark:bg-green-900/20 dark:text-green-400',
}

const ROLE_OPTIONS: User['role'][] = ['viewer', 'editor', 'administrator']

function isChecked(value: boolean | 'indeterminate') {
  return value === true
}

function getEmailError(email: string): string | null {
  const normalizedEmail = email.trim()
  if (!normalizedEmail) return "L'email est requis."
  if (!EMAIL_PATTERN.test(normalizedEmail)) return 'Veuillez saisir une adresse email valide.'
  return null
}

function getPasswordError(password: string): string | null {
  if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caracteres.'
  return null
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown data-icon="inline-end" />
  return direction === 'asc' ? <ArrowUpAZ data-icon="inline-end" /> : <ArrowDownAZ data-icon="inline-end" />
}

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
}: {
  label: string
  sortKey: SortKey
  activeSortKey: SortKey
  sortDirection: SortDirection
  onSort: (nextKey: SortKey) => void
}) {
  return (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 px-2"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <SortIcon active={activeSortKey === sortKey} direction={sortDirection} />
      </Button>
    </TableHead>
  )
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [activeUsername, setActiveUsername] = useState('')
  const [draft, setDraft] = useState<User>(EMPTY_USER)
  const [initialPassword, setInitialPassword] = useState('')
  const [showValidation, setShowValidation] = useState(false)
  const [touchedFields, setTouchedFields] = useState({ email: false, password: false })
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('username')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => backend.getUsers(),
  })

  const users = usersQuery.data ?? []
  const allSelected = users.length > 0 && selectedUsernames.length === users.length
  const isCreateMode = dialogMode === 'create'
  const isEditMode = dialogMode === 'edit'
  const isViewMode = dialogMode === 'view'
  const hasPasswordChanged = isCreateMode || (draft.password ?? '') !== initialPassword
  const emailError = isViewMode ? null : getEmailError(draft.email)
  const passwordError = isViewMode || !hasPasswordChanged ? null : getPasswordError(draft.password ?? '')
  const shouldShowEmailError = Boolean(emailError && (showValidation || touchedFields.email))
  const shouldShowPasswordError = Boolean(passwordError && (showValidation || touchedFields.password))
  const isFormInvalid = !draft.username.trim() || Boolean(emailError) || Boolean(passwordError)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isCreateMode) {
        return backend.createUser(draft)
      }

      const updatePayload: User = {
        username: draft.username,
        email: draft.email,
        role: draft.role,
      }

      if ((draft.password ?? '') !== initialPassword) {
        updatePayload.password = draft.password
      }

      return backend.updateUser(activeUsername, updatePayload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setDialogMode(null)
      setActiveUsername('')
      setDraft(EMPTY_USER)
      setInitialPassword('')
      setShowValidation(false)
      setTouchedFields({ email: false, password: false })
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

  const anyError = deleteUsersMutation.error
    ?? exportMutation.error
    ?? importMutation.error

  useEffect(() => {
    const usernames = new Set(users.map((user) => user.username))
    setSelectedUsernames((previous) => previous.filter((username) => usernames.has(username)))
  }, [users])

  const selectedCount = selectedUsernames.length
  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => {
      const leftValue = sortKey === 'username' ? left.username : left.email
      const rightValue = sortKey === 'username' ? right.username : right.email
      const result = leftValue.localeCompare(rightValue, 'fr', { sensitivity: 'base' })
      if (result !== 0) {
        return sortDirection === 'asc' ? result : -result
      }

      return left.username.localeCompare(right.username, 'fr', { sensitivity: 'base' })
    }),
    [sortDirection, sortKey, users],
  )

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextKey)
    setSortDirection('asc')
  }

  const openCreateDialog = () => {
    saveMutation.reset()
    setDialogMode('create')
    setActiveUsername('')
    setDraft(EMPTY_USER)
    setInitialPassword('')
    setShowValidation(false)
    setTouchedFields({ email: false, password: false })
  }

  const openViewDialog = (user: User) => {
    saveMutation.reset()
    setDialogMode('view')
    setActiveUsername(user.username)
    setDraft(user)
    setInitialPassword(user.password ?? '')
    setShowValidation(false)
    setTouchedFields({ email: false, password: false })
  }

  const openEditDialog = (user: User) => {
    saveMutation.reset()
    setDialogMode('edit')
    setActiveUsername(user.username)
    setDraft(user)
    setInitialPassword(user.password ?? '')
    setShowValidation(false)
    setTouchedFields({ email: false, password: false })
  }

  const closeDialog = () => {
    saveMutation.reset()
    setDialogMode(null)
    setActiveUsername('')
    setDraft(EMPTY_USER)
    setInitialPassword('')
    setShowValidation(false)
    setTouchedFields({ email: false, password: false })
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

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
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
            <Button size="sm" onClick={openCreateDialog}            >
              <Plus data-icon="inline-start" />
              Ajouter un utilisateur
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/80">
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
                <SortableHeader
                  label="Identifiant"
                  sortKey="username"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Email"
                  sortKey="email"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
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
                        <Badge variant="outline" className={ROLE_CLASSNAME[user.role]}>
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
        </div>
      </div>

      <Separator className="bg-border/80 mt-10" />

      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-base font-semibold tracking-wider text-foreground mb-5">
          <Database />
          <h2>Administration</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <Download data-icon="inline-start" />
            {exportMutation.isPending ? 'Export…' : 'Exporter la base'}
          </Button>
          <Button
            variant="outline"
            onClick={() => importInputRef.current?.click()}
            disabled={importMutation.isPending}
          >
            <Upload />
            {importMutation.isPending ? 'Import…' : 'Importer la base'}
          </Button>
          <Input
            ref={importInputRef}
            id="import-db"
            type="file"
            accept=".zip"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) importMutation.mutate(file)
              event.target.value = ''
            }}
          />
        </div>
      </div>

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

          {saveMutation.error && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Une erreur est survenue</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap break-words">
                {apiError(saveMutation.error)}
              </AlertDescription>
            </Alert>
          )}

          {!saveMutation.error && (shouldShowEmailError || shouldShowPasswordError) && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Formulaire invalide</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap break-words">
                {[emailError, passwordError].filter(Boolean).join('\n')}
              </AlertDescription>
            </Alert>
          )}

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
                onChange={(event) => {
                  saveMutation.reset()
                  setTouchedFields((previous) => ({ ...previous, email: true }))
                  setDraft((previous) => ({ ...previous, email: event.target.value }))
                }}
                onBlur={() => setTouchedFields((previous) => ({ ...previous, email: true }))}
                aria-invalid={shouldShowEmailError}
                className="bg-input/50"
                placeholder="ex: john@example.com"
              />
              {shouldShowEmailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Mot de passe</Label>
              <Input
                type={isCreateMode ? 'password' : 'text'}
                value={draft.password ?? ''}
                readOnly={isViewMode}
                onChange={(event) => {
                  saveMutation.reset()
                  setTouchedFields((previous) => ({ ...previous, password: true }))
                  setDraft((previous) => ({ ...previous, password: event.target.value }))
                }}
                onBlur={() => setTouchedFields((previous) => ({ ...previous, password: true }))}
                aria-invalid={shouldShowPasswordError}
                className="bg-input/50"
                placeholder={isCreateMode ? 'Mot de passe' : '—'}
              />
              {shouldShowPasswordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Rôle</Label>
              {isViewMode ? (
                <div className="flex min-h-8 items-center">
                  <Badge variant="outline" className={ROLE_CLASSNAME[draft.role]}>{draft.role}</Badge>
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
                onClick={() => {
                  setShowValidation(true)
                  if (isFormInvalid) return
                  saveMutation.mutate()
                }}
                disabled={saveMutation.isPending || !draft.username.trim()}
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
