import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { backend, setAuthToken } from '../lib/api'
import type { User } from '../lib/types'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'pyglidercg_token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setAuthToken(token)
    if (!token) {
      setLoading(false)
      setUser(null)
      return
    }
    backend
      .me()
      .then((nextUser) => setUser(nextUser))
      .catch(() => {
        setUser(null)
        setToken(null)
        localStorage.removeItem(TOKEN_KEY)
        setAuthToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      async login(username: string, password: string) {
        const auth = await backend.login(username, password)
        localStorage.setItem(TOKEN_KEY, auth.access_token)
        setToken(auth.access_token)
        const profile = await backend.me()
        setUser(profile)
      },
      async logout() {
        try {
          await backend.logout()
        } finally {
          setToken(null)
          setUser(null)
          localStorage.removeItem(TOKEN_KEY)
          setAuthToken(null)
        }
      },
    }),
    [loading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
