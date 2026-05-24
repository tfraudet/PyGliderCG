import { Link, useLocation } from 'react-router-dom'
import { apiError } from '../lib/api'
import { useAuth } from '../state/auth'

function navClass(active: boolean) {
  return [
    'rounded-md border px-3 py-2 text-sm font-semibold transition',
    active ? 'border-amber-300 bg-amber-300/20 text-amber-100' : 'border-white/20 text-blue-100 hover:bg-white/10',
  ].join(' ')
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, loading, login, logout } = useAuth()

  async function onLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const username = String(formData.get('username') ?? '')
    const password = String(formData.get('password') ?? '')
    try {
      await login(username, password)
    } catch (error) {
      alert(apiError(error))
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6">
      <header className="mb-4 rounded-xl border border-white/15 bg-slate-900/70 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-200">ACPH</p>
            <h1 className="text-2xl font-black text-white">PyGliderCG React</h1>
          </div>
          {loading ? null : user ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-blue-100">
                Connecté: <b>{user.username}</b> ({user.role})
              </p>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-md border border-white/30 px-3 py-2 text-sm font-semibold hover:bg-white/10"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <form className="flex flex-wrap items-center gap-2" onSubmit={onLogin}>
              <input
                name="username"
                placeholder="Identifiant"
                className="rounded-md border border-white/30 bg-black/20 px-3 py-2 text-sm"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Mot de passe"
                className="rounded-md border border-white/30 bg-black/20 px-3 py-2 text-sm"
                required
              />
              <button
                type="submit"
                className="rounded-md border border-emerald-300 bg-emerald-500/20 px-3 py-2 text-sm font-semibold"
              >
                Se connecter
              </button>
            </form>
          )}
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          <Link to="/" className={navClass(pathname === '/')}>
            Accueil
          </Link>
          {user && (user.role === 'administrator' || user.role === 'editor') ? (
            <>
              <Link to="/gliders" className={navClass(pathname.startsWith('/gliders'))}>
                Planeurs
              </Link>
              <Link to="/weighings" className={navClass(pathname.startsWith('/weighings'))}>
                Pesées
              </Link>
            </>
          ) : null}
          {user?.role === 'administrator' ? (
            <>
              <Link to="/users" className={navClass(pathname.startsWith('/users'))}>
                Utilisateurs
              </Link>
              <Link to="/audit" className={navClass(pathname.startsWith('/audit'))}>
                Audit Log
              </Link>
            </>
          ) : null}
        </nav>
      </header>
      <main className="rounded-xl border border-white/15 bg-slate-950/70 p-4 backdrop-blur">{children}</main>
    </div>
  )
}
