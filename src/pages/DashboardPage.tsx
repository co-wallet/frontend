import { Link, useNavigate } from 'react-router-dom'
import { Wallet, BarChart2, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">co-wallet</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut size={16} /> Выйти
          </button>
        </div>

        <div className="bg-card rounded-lg border p-4 mb-4">
          <p className="text-sm text-muted-foreground">Добро пожаловать,</p>
          <p className="text-lg font-semibold">{user?.username}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/accounts"
            className="bg-card rounded-lg border p-4 flex flex-col items-center gap-2 hover:bg-muted"
          >
            <Wallet size={24} className="text-primary" />
            <span className="text-sm font-medium">Счета</span>
          </Link>
          <div className="bg-card rounded-lg border p-4 flex flex-col items-center gap-2 opacity-40">
            <BarChart2 size={24} className="text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Аналитика</span>
            <span className="text-xs text-muted-foreground">скоро</span>
          </div>
        </div>
      </div>
    </div>
  )
}
