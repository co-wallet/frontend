import { Link } from 'react-router-dom'
import { Users, Coins, ArrowLeft, Mail } from 'lucide-react'

export function AdminPage() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1">
            <ArrowLeft size={14} /> На главную
          </Link>
          <h1 className="text-xl font-bold">Администрирование</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/admin/users"
            className="bg-card rounded-lg border p-5 flex flex-col items-center gap-3 hover:bg-muted transition-colors"
          >
            <Users size={28} className="text-primary" />
            <span className="text-sm font-medium">Пользователи</span>
          </Link>
          <Link
            to="/admin/invites"
            className="bg-card rounded-lg border p-5 flex flex-col items-center gap-3 hover:bg-muted transition-colors"
          >
            <Mail size={28} className="text-primary" />
            <span className="text-sm font-medium">Приглашения</span>
          </Link>
          <Link
            to="/admin/currencies"
            className="bg-card rounded-lg border p-5 flex flex-col items-center gap-3 hover:bg-muted transition-colors col-span-2"
          >
            <Coins size={28} className="text-primary" />
            <span className="text-sm font-medium">Валюты</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
