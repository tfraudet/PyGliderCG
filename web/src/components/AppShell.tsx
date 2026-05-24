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
  const [showPassword, setShowPassword] = useState(false)

  // Never collapse when not authenticated — login form needs space
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
        className={clsx(
          'flex flex-shrink-0 flex-col border-r border-white/10 bg-slate-950 transition-[width] duration-300',
          isCollapsed ? 'w-14' : 'w-56',
        )}
      >
        {/* Branding + collapse */}
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
          <span className="shrink-0 text-xl">🛩️</span>
          {!isCollapsed && (
            <span className="font-[Bricolage_Grotesque] truncate text-sm font-bold text-white">
              Aéroclub ACPH
            </span>
          )}
          {user && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="ml-auto shrink-0 rounded p-1 text-blue-200/60 hover:bg-white/10 hover:text-white"
              title={isCollapsed ? 'Déplier' : 'Replier'}
            >
              {isCollapsed ? '»' : '«'}
            </button>
          )}
        </div>

        {/* ── Authenticated: user info + nav ── */}
        {user && (
          <>
            {!isCollapsed && (
              <div className="border-b border-white/10 px-3 py-3">
                <p className="text-sm font-semibold text-white">Bienvenue, {user.username}</p>
                <p className="mt-0.5 text-xs text-blue-200/70">
                  Votre role est{' '}
                  <span className="font-medium text-amber-300 underline underline-offset-2">{user.role}</span>
                </p>
              </div>
            )}

            <nav className="flex-1 py-2">
              {visibleLinks.map(({ to, label, icon }) => {
                const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
                return (
                  <Link
                    key={to}
                    to={to}
                    title={isCollapsed ? label : undefined}
                    className={clsx(
                      'flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'border-amber-300 bg-amber-300/10 font-semibold text-amber-100'
                        : 'border-transparent text-blue-100/75 hover:bg-white/8 hover:text-blue-50',
                      isCollapsed && 'justify-center',
                    )}
                  >
                    <span className="shrink-0 text-base leading-none">{icon}</span>
                    {!isCollapsed && <span>{label}</span>}
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-white/10 p-2">
              <button
                type="button"
                onClick={() => logout()}
                title={isCollapsed ? 'Déconnexion' : undefined}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-300/80 hover:bg-red-500/10 hover:text-red-200',
                  isCollapsed && 'justify-center',
                )}
              >
                <span className="shrink-0">🚪</span>
                {!isCollapsed && <span>Déconnexion</span>}
              </button>
            </div>
          </>
        )}

        {/* ── Unauthenticated: login form ── */}
        {!user && !loading && (
          <div className="flex flex-1 flex-col px-4 py-5">
            <p className="mb-5 font-[Bricolage_Grotesque] text-xl font-bold text-white">Connexion</p>
            <form onSubmit={onLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-blue-100/80">Identifiant</label>
                <input
                  name="username"
                  autoComplete="username"
                  className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-blue-200/30 focus:ring-2 focus:ring-amber-300/50"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-blue-100/80">Mot de passe</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-blue-200/30 focus:ring-2 focus:ring-amber-300/50"
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-200/50 hover:text-blue-200"
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                        <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                        <path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {loginError && (
                <p className="rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300">{loginError}</p>
              )}
              <button
                type="submit"
                className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 active:scale-[0.98]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                  <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.047a.75.75 0 1 0-1.06-1.061l-2.25 2.25a.75.75 0 0 0 0 1.061l2.25 2.25a.75.75 0 1 0 1.06-1.06L8.704 10.75H18.25A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
                </svg>
                Se connecter
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        {!isCollapsed && (
          <div className="border-t border-white/10 px-3 py-3">
            <p className="text-xs text-blue-200/50">Made with ❤ by ACPH</p>
            <p className="text-xs text-blue-200/35">version 1.1.0</p>
          </div>
        )}
      </aside>

      {/* ── Main area ── */}
      <main className="flex min-h-screen flex-1 flex-col overflow-hidden p-5">
        {children}
      </main>
    </div>
  )
}
