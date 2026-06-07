import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  PlaneTakeoff,
  Scale,
  Users,
  ClipboardList,
  LogOut,
  LogIn,
  Eye,
  EyeOff,
  Heart,
  TriangleAlert,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { type AppRole, hasRequiredRole } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { apiError } from '@/lib/api'
import { useAuth } from '@/state/auth'

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', Icon: Home, minRole: null },
  { to: '/gliders', label: 'Planeurs', Icon: PlaneTakeoff, minRole: 'editor' },
  { to: '/weighings', label: 'Pesées', Icon: Scale, minRole: 'editor' },
  { to: '/users', label: 'Utilisateurs', Icon: Users, minRole: 'administrator' },
  { to: '/audit', label: 'Audit Log', Icon: ClipboardList, minRole: 'administrator' },
] satisfies Array<{ to: string; label: string; Icon: typeof Home; minRole: AppRole | null }>

const EMPTY_LOGIN_FORM = {
  username: '',
  password: '',
}

const EMPTY_LOGIN_TOUCHED = {
  username: false,
  password: false,
}

function getUsernameError(username: string) {
  if (!username.trim()) return "L'identifiant est requis."
  return null
}

function getPasswordError(password: string) {
  if (!password) return 'Le mot de passe est requis.'
  return null
}

export function AppSidebar() {
  const { pathname } = useLocation()
  const { user, loading, login, logout } = useAuth()
  const { state, isMobile, openMobile, setOpen, setOpenMobile } = useSidebar()
  const [loginError, setLoginError] = useState('')
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM)
  const [loginTouched, setLoginTouched] = useState(EMPTY_LOGIN_TOUCHED)
  const [showLoginValidation, setShowLoginValidation] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isCollapsed = isMobile ? !openMobile : state === 'collapsed'
  const usernameError = getUsernameError(loginForm.username)
  const passwordError = getPasswordError(loginForm.password)
  const shouldShowUsernameError = Boolean(usernameError && (showLoginValidation || loginTouched.username))
  const shouldShowPasswordError = Boolean(passwordError && (showLoginValidation || loginTouched.password))

  const visibleLinks = NAV_ITEMS.filter(({ minRole }) => {
    if (!minRole) return true
    return hasRequiredRole(user?.role, minRole)
  })

  function updateLoginField(field: keyof typeof loginForm, value: string) {
    setLoginForm((previous) => ({ ...previous, [field]: value }))
    if (loginError) {
      setLoginError('')
    }
  }

  function markLoginFieldTouched(field: keyof typeof loginTouched) {
    setLoginTouched((previous) => ({ ...previous, [field]: true }))
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setShowLoginValidation(true)

    if (usernameError || passwordError) {
      return
    }

    try {
      setLoginError('')
      await login(loginForm.username.trim(), loginForm.password)
    } catch (error) {
      setLoginError(apiError(error))
    }
  }

  function openLoginPanel() {
    if (isMobile) {
      setOpenMobile(true)
      return
    }

    setOpen(true)
  }

  return (
    <Sidebar className="md:top-0 md:h-auto md:min-h-[calc(100svh_-_var(--header-height))]">
      {/* <SidebarHeader className="flex items-center justify-between gap-2 px-4 py-3.5">
        {!isCollapsed && (
        )}
      </SidebarHeader> */}

      <SidebarContent>
        {/* On mobile the sidebar covers the full screen; push content below the sticky header */}
        <div className="h-[--header-height] shrink-0 md:hidden" aria-hidden="true" />
        {/* Collapsed: login shortcut for unauthenticated users */}
        {isCollapsed && !user && (
          <div className="flex flex-col items-center justify-start gap-2 py-2">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-9 w-9 text-primary hover:bg-sidebar-accent"
                  onClick={openLoginPanel}
                >
                  <LogIn />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Se connecter</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Expanded: authenticated content */}
        {!isCollapsed && user && (
          <>
            <div className="px-3 py-3">
              <p className="text-sm font-semibold text-foreground">Bienvenue, {user.username}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rôle :</span>
                {/* <Badge variant="secondary" className="capitalize bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"> */}
                <Badge variant="secondary" className="capitalize bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {user.role}
                </Badge>
              </div>
            </div>

            <Separator className="my-2" />
          </>
        )}

        {/* Navigation */}
        {user && (
          <SidebarMenu>
            {visibleLinks.map(({ to, label, Icon }) => {
              const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
              return (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    isActive={active}
                    tooltip={label}
                    className={cn(
                      'transition-colors',
                      active && 'bg-sidebar-accent text-sidebar-accent-foreground'
                    )}
                  >
                    <Link to={to} className="flex w-full items-center gap-2">
                      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                      {!isCollapsed && <span>{label}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
            {isCollapsed && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Déconnexion"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  type="button"
                  onClick={() => logout()}
                >
                  <LogOut />
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        )}

        {/* Login form */}
        {!isCollapsed && !user && !loading && (
          <div className="flex flex-1 flex-col px-2 py-3">
            <h2 className="mb-3 text-lg font-bold text-foreground">Connexion</h2>
            <form onSubmit={onLogin} noValidate className="flex flex-col gap-4">
              {loginError && (
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>Connexion impossible</AlertTitle>
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="sidebar-username"
                  className={cn('text-sm text-muted-foreground', shouldShowUsernameError && 'text-destructive')}
                >
                  Identifiant
                </Label>
                <InputGroup>
                  <InputGroupInput
                    id="sidebar-username"
                    name="username"
                    value={loginForm.username}
                    onChange={(event) => updateLoginField('username', event.target.value)}
                    onBlur={() => markLoginFieldTouched('username')}
                    autoComplete="username"
                    aria-invalid={shouldShowUsernameError || undefined}
                  />
                </InputGroup>
                {shouldShowUsernameError && (
                  <p className="text-xs text-destructive">
                    {usernameError}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="sidebar-password"
                  className={cn('text-sm text-muted-foreground', shouldShowPasswordError && 'text-destructive')}
                >
                  Mot de passe
                </Label>
                <InputGroup>
                  <InputGroupInput
                    id="sidebar-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(event) => updateLoginField('password', event.target.value)}
                    onBlur={() => markLoginFieldTouched('password')}
                    autoComplete="current-password"
                    aria-invalid={shouldShowPasswordError || undefined}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {shouldShowPasswordError && (
                  <p className="text-xs text-destructive">
                    {passwordError}
                  </p>
                )}
              </div>
              <Button type="submit" className="mt-1 gap-2" disabled={loading}>
                <LogIn data-icon="inline-start" />
                Se connecter
              </Button>
            </form>
          </div>
        )}

        {/* Expanded: logout button */}
        {!isCollapsed && user && (
          <>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              type="button"
              onClick={() => logout()}
            >
              <LogOut data-icon="inline-start" />
              Déconnexion
            </Button>
          </>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="flex items-center justify-center px-3 py-3">
        {isCollapsed ? (
          <button 
            className="text-sm text-muted-foreground/50 text-center hover:text-muted-foreground transition-colors" 
            title="Made with ❤ by ACPH"
            onClick={() => window.open('http://aeroclub-issoire.fr', '_blank')}
          >
            <Heart size={16} className="fill-lime-600 hover:fill-lime-400" color="green" />
          </button>
        ) : (
          <div className="flex w-full flex-col gap-3 text-center">
            <img
              src="/img/acph-logo-v2017-gray.png"
              alt="Logo ACPH Aeroclub Pierre Herbaud"
              className="h-auto max-h-16 w-auto self-start object-contain"
            />
            <div>
              <p className="text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1">
                Made with
                <Heart size={12} className="fill-lime-600" />
                by <a href="http://aeroclub-issoire.fr" target="_blank" rel="noopener noreferrer" className="hover:underline">ACPH</a>
              </p>
              <p className="text-[11px] text-muted-foreground/40">version {__APP_VERSION__}</p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
