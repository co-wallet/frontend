import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">co-wallet</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Выйти
          </button>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Добро пожаловать,</p>
          <p className="text-lg font-semibold">{user?.username}</p>
          <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Dashboard — в разработке
        </p>
      </div>
    </div>
  )
}
