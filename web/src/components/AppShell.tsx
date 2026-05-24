import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { apiError } from '../lib/api'
import { useAuth } from '../state/auth'

const roleOrder: Record<string, number> = { viewer: 1, editor: 2, administrator: 3 }

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: '🏠', minRole: null },
  { to: '/gliders', label: 'Planeurs', icon: '✈️', minRole: 'editor' },
  { to: '/weighings', label: 'Pesées', icon: '⚖️', minRole: 'editor' },
  { to: '/users', label: 'Utilisateurs', icon: '👤', minRole: 'administrator' },
  { to: '/audit', label: 'Audit Log', icon: '📋', minRole: 'administrator' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, loading, login, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [loginError, setLoginError] = useState('')

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
        className={clsx(
          'flex flex-shrink-0 flex-col border-r border-white/10 bg-slate-950 transition-[width] duration-300',
          collapsed ? 'w-14' : 'w-52',
        )}
      >
        {/* Branding + collapse */}
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
          <span className="shrink-0 text-xl">🛩️</span>
          {!collapsed && (
            <span className="font-[Bricolage_Grotesque] truncate text-sm font-bold text-white">
              Aéroclub ACPH
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto shrink-0 rounded p-1 text-blue-200/60 hover:bg-white/10 hover:text-white"
            title={collapsed ? 'Déplier' : 'Replier'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/* User info */}
        {user && !collapsed && (
          <div className="border-b border-white/10 px-3 py-3">
            <p className="text-sm font-semibold text-white">Bienvenue, {user.username}</p>
            <p className="mt-0.5 text-xs text-blue-200/70">
              Votre role est{' '}
              <span className="font-medium text-amber-300 underline underline-offset-2">{user.role}</span>
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-2">
          {visibleLinks.map(({ to, label, icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={clsx(
                  'flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'border-amber-300 bg-amber-300/10 font-semibold text-amber-100'
                    : 'border-transparent text-blue-100/75 hover:bg-white/8 hover:text-blue-50',
                  collapsed && 'justify-center',
                )}
              >
                <span className="shrink-0 text-base leading-none">{icon}</span>
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        {user && (
          <div className="border-t border-white/10 p-2">
            <button
              type="button"
              onClick={() => logout()}
              title={collapsed ? 'Déconnexion' : undefined}
              className={clsx(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-300/80 hover:bg-red-500/10 hover:text-red-200',
                collapsed && 'justify-center',
              )}
            >
              <span className="shrink-0">🚪</span>
              {!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        )}

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-white/10 px-3 py-3">
            <p className="text-xs text-blue-200/50">Made with ❤ by ACPH</p>
            <p className="text-xs text-blue-200/35">version 1.1.0</p>
          </div>
        )}
      </aside>

      {/* ── Main area ── */}
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-5 py-3 backdrop-blur">
          <div />
          {loading ? null : !user ? (
            <form className="flex flex-wrap items-center gap-2" onSubmit={onLogin}>
              <input
                name="username"
                placeholder="Identifiant"
                autoComplete="username"
                className="rounded-md border border-white/25 bg-black/25 px-3 py-1.5 text-sm outline-none placeholder:text-blue-200/40 focus:ring-2 focus:ring-amber-300/50"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Mot de passe"
                autoComplete="current-password"
                className="rounded-md border border-white/25 bg-black/25 px-3 py-1.5 text-sm outline-none placeholder:text-blue-200/40 focus:ring-2 focus:ring-amber-300/50"
                required
              />
              <button
                type="submit"
                className="rounded-md border border-emerald-300/80 bg-emerald-500/20 px-3 py-1.5 text-sm font-semibold hover:bg-emerald-500/30"
              >
                Se connecter
              </button>
              {loginError ? <p className="text-xs text-red-300">{loginError}</p> : null}
            </form>
          ) : (
            <p className="text-xs text-blue-200/50">
              {user.username} · {user.role}
            </p>
          )}
        </div>

        {/* Page content */}
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  )
}
