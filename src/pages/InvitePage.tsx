import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { invitesApi } from '@/api/invites'
import { currenciesApi } from '@/api/currencies'
import { useAuthStore } from '@/store/authStore'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState('USD')
  const [error, setError] = useState('')

  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => invitesApi.validate(token!),
    retry: false,
  })

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies-public'],
    queryFn: () => currenciesApi.list(),
    staleTime: 60_000,
  })

  const accept = useMutation({
    mutationFn: () => invitesApi.accept(token!, username, password, defaultCurrency),
    onSuccess: ({ user, tokens }) => {
      setAuth(tokens.accessToken, tokens.refreshToken, user)
      navigate('/dashboard', { replace: true })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? 'Ошибка при создании аккаунта')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <p className="text-muted-foreground text-sm">Проверяем ссылку...</p>
      </div>
    )
  }

  if (isError || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="bg-card rounded-lg border p-6 w-full max-w-sm text-center">
          <p className="font-semibold text-destructive mb-2">Ссылка недействительна</p>
          <p className="text-sm text-muted-foreground">
            Приглашение уже использовано или истёк срок действия. Попросите администратора выслать новое.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="bg-card rounded-lg border p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1">Создание аккаунта</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Вас пригласили в co-wallet. Аккаунт будет привязан к <strong>{invite.email}</strong>.
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); setError(''); accept.mutate() }}
        >
          <div>
            <label className="block text-sm font-medium mb-1">Имя пользователя</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="myname"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Минимум 8 символов"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Валюта по умолчанию</label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              {currencies.length > 0
                ? currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}{c.symbol ? ` (${c.symbol})` : ''}
                    </option>
                  ))
                : <option value="USD">USD</option>
              }
            </select>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={accept.isPending}
            className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {accept.isPending ? 'Создание...' : 'Создать аккаунт'}
          </button>
        </form>
      </div>
    </div>
  )
}
