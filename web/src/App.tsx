import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AuditPage } from './pages/AuditPage'
import { GlidersPage } from './pages/GlidersPage'
import { HomePage } from './pages/HomePage'
import { UsersPage } from './pages/UsersPage'
import { WeighingsPage } from './pages/WeighingsPage'
import { useAuth } from './state/auth'

const roleOrder: Record<string, number> = {
  viewer: 1,
  editor: 2,
  administrator: 3,
}

function Guard({
  children,
  minRole,
}: {
  children: ReactElement
  minRole: 'viewer' | 'editor' | 'administrator'
}) {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/" replace />
  }
  if (roleOrder[user.role] < roleOrder[minRole]) {
    return <Navigate to="/" replace />
  }
  return children
}

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/gliders"
          element={
            <Guard minRole="editor">
              <GlidersPage />
            </Guard>
          }
        />
        <Route
          path="/weighings"
          element={
            <Guard minRole="editor">
              <WeighingsPage />
            </Guard>
          }
        />
        <Route
          path="/users"
          element={
            <Guard minRole="administrator">
              <UsersPage />
            </Guard>
          }
        />
        <Route
          path="/audit"
          element={
            <Guard minRole="administrator">
              <AuditPage />
            </Guard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
