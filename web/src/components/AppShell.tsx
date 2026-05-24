import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home, PlaneTakeoff, Scale, Users, ClipboardList,
  ChevronLeft, ChevronRight, LogOut, LogIn, Eye, EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { apiError } from '@/lib/api'
import { useAuth } from '@/state/auth'

const roleOrder: Record<string, number> = { viewer: 1, editor: 2, administrator: 3 }

const NAV_ITEMS = [
  { to: '/',          label: 'Accueil',       Icon: Home,          minRole: null },
  { to: '/gliders',   label: 'Planeurs',      Icon: PlaneTakeoff,  minRole: 'editor' },
  { to: '/weighings', label: 'Pesées',        Icon: Scale,         minRole: 'editor' },
  { to: '/users',     label: 'Utilisateurs',  Icon: Users,         minRole: 'administrator' },
  { to: '/audit',     label: 'Audit Log',     Icon: ClipboardList, minRole: 'administrator' },
]

const ROLE_COLORS: Record<string, string> = {
  administrator: 'text-primary font-semibold',
  editor:        'text-foreground',
  viewer:        'text-muted-foreground',
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, loading, login, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isCollapsed = user ? collapsed : false

  const visibleLinks = NAV_ITEMS.filter(({ minRole }) => {
    if (!minRole) return true
    if (!user) return false
    return roleOrder[user.role] >= roleOrder[minRole as string]
  })

  async function onLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')
    const fd = new FormData(event.currentTarget)
    try {
      await login(String(fd.get('username') ?? ''), String(fd.get('password') ?? ''))
    } catch (error) {
      setLoginError(apiError(error))
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'flex flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300',
          isCollapsed ? 'w-14' : 'w-58',
        )}
      >
        {/* Branding */}
        <div className={cn(
          'flex items-center gap-2.5 px-3 py-3.5',
          isCollapsed && 'justify-center',
        )}>
          <PlaneTakeoff
            className="shrink-0 text-primary"
            size={20}
            strokeWidth={1.8}
          />
          {!isCollapsed && (
            <span
              className="truncate text-sm font-bold tracking-tight text-foreground"
            >
              Aéroclub ACPH
            </span>
          )}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed((c) => !c)}
              title={isCollapsed ? 'Déplier' : 'Replier'}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </Button>
          )}
        </div>

        <Separator className="bg-sidebar-border" />

        {/* ── Authenticated: user info + nav ── */}
        {user && (
          <>
            {!isCollapsed && (
              <div className="px-3 py-3">
                <p className="text-sm font-semibold text-foreground">Bienvenue, {user.username}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Rôle :{' '}
                  <span className={cn('font-medium underline underline-offset-2', ROLE_COLORS[user.role] ?? 'text-foreground')}>
                    {user.role}
                  </span>
                </p>
              </div>
            )}

            <nav className="flex-1 space-y-0.5 px-1.5 py-2">
              {visibleLinks.map(({ to, label, Icon }) => {
                const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
                const linkCls = cn(
                  'flex items-center gap-3 rounded-md border-l-2 px-2.5 py-2 text-sm transition-colors',
                  active
                    ? 'border-primary bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                  isCollapsed && 'justify-center px-2',
                )
                return isCollapsed ? (
                  <Tooltip key={to}>
                    <TooltipTrigger className="block w-full">
                      <Link to={to} className={linkCls}>
                        <Icon size={16} className="shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Link key={to} to={to} className={linkCls}>
                    <Icon size={16} className="shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </nav>

            <Separator className="bg-sidebar-border" />

            <div className="p-2">
              <Tooltip>
                <TooltipTrigger className="block w-full">
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive',
                      isCollapsed && 'justify-center px-2',
                    )}
                    onClick={() => logout()}
                  >
                    <LogOut size={16} strokeWidth={1.8} />
                    {!isCollapsed && 'Déconnexion'}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Déconnexion</TooltipContent>}
              </Tooltip>
            </div>
          </>
        )}

        {/* ── Unauthenticated: login form ── */}
        {!user && !loading && (
          <div className="flex flex-1 flex-col px-4 py-5">
            <div className="mb-5 flex items-center gap-2.5">
              <LogIn size={18} className="text-primary" strokeWidth={1.8} />
              <h2
                className="text-lg font-bold text-foreground"
              >
                Connexion
              </h2>
            </div>
            <form onSubmit={onLogin} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sidebar-username" className="text-sm text-muted-foreground">
                  Identifiant
                </Label>
                <Input
                  id="sidebar-username"
                  name="username"
                  autoComplete="username"
                  className="bg-input/50 border-border/60 focus-visible:ring-primary/60"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sidebar-password" className="text-sm text-muted-foreground">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="sidebar-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="bg-input/50 border-border/60 pr-10 focus-visible:ring-primary/60"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    tabIndex={-1}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                </div>
              </div>
              {loginError && (
                <p className="rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">
                  {loginError}
                </p>
              )}
              <Button type="submit" className="mt-1 gap-2">
                <LogIn size={15} strokeWidth={2} />
                Se connecter
              </Button>
            </form>
          </div>
        )}

        {/* Footer */}
        {!isCollapsed && (
          <>
            <Separator className="bg-sidebar-border" />
            <div className="px-3 py-3">
              <p className="text-[11px] text-muted-foreground/60">Made with ❤ by ACPH</p>
              <p className="text-[11px] text-muted-foreground/40">version 1.1.0</p>
            </div>
          </>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="flex min-h-screen flex-1 flex-col overflow-hidden p-6">
        {children}
      </main>
    </div>
  )
}

