import { useState } from 'react'
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
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
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

export function AppSidebar() {
  const { pathname } = useLocation()
  const { user, loading, login, logout } = useAuth()
  const { state, isMobile, openMobile, setOpen, setOpenMobile } = useSidebar()
  const [loginError, setLoginError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isCollapsed = isMobile ? !openMobile : state === 'collapsed'

  const visibleLinks = NAV_ITEMS.filter(({ minRole }) => {
    if (!minRole) return true
    return hasRequiredRole(user?.role, minRole)
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

  function openLoginPanel() {
    if (isMobile) {
      setOpenMobile(true)
      return
    }

    setOpen(true)
  }

  return (
    <Sidebar className="top-[--header-height] h-[calc(100svh-var(--header-height))] md:top-0 md:h-auto md:min-h-[calc(100svh-var(--header-height))]">
      {/* <SidebarHeader className="flex items-center justify-between gap-2 px-4 py-3.5">
        {!isCollapsed && (
        )}
      </SidebarHeader> */}

      <SidebarContent>
        {/* Collapsed: login shortcut for unauthenticated users */}
        {isCollapsed && !user && (
          <div className="flex flex-col items-center justify-start space-y-2 py-2">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-primary hover:bg-sidebar-accent"
                  onClick={openLoginPanel}
                >
                  <LogIn size={18} strokeWidth={1.8} />
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
                  onClick={() => logout()}
                >
                  <LogOut size={16} strokeWidth={1.8} className="shrink-0" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        )}

        {/* Login form */}
        {!isCollapsed && !user && !loading && (
          <div className="flex flex-1 flex-col px-2 py-3">
            <h2 className="mb-3 text-lg font-bold text-foreground">Connexion</h2>
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
                  {String(loginError)}
                </p>
              )}
              <Button type="submit" className="mt-1 gap-2">
                <LogIn size={15} strokeWidth={2} />
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
              onClick={() => logout()}
            >
              <LogOut size={16} strokeWidth={1.8} />
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
          <div className="w-full text-center">
            <p className="text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1">
              Made with
              <Heart size={12} className="fill-lime-600" />
              by <a href="http://aeroclub-issoire.fr" target="_blank" rel="noopener noreferrer" className="hover:underline">ACPH</a>
            </p>
            <p className="text-[11px] text-muted-foreground/40">version 2.2.0</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
