import { Redirect } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  if (!isAuthenticated) return <Redirect to="/login" />
  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const user = useAuthStore((s) => s.user)
  if (!isAuthenticated) return <Redirect to="/login" />
  if (!user?.isAdmin) return <Redirect to="/dashboard" />
  return <>{children}</>
}
