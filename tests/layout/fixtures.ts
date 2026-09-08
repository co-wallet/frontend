// Development-only entry point. All API calls use fixtures; no server data is read or written.
import axios from 'axios'

const params = new URLSearchParams(location.search)
const path = params.get('page') || '/dashboard'
const state = params.get('state') || 'populated'
const user = { id: 'layout-user', username: 'Тестовый пользователь', email: 'layout@example.test', defaultCurrency: 'RUB', isAdmin: true, isActive: true }
const members = [{ accountId: 'layout-account', userId: user.id, username: user.username, defaultShare: 1 }]
const account = {
  id: 'layout-account', ownerId: user.id, name: 'Семейный счёт', accessMode: 'shared', kind: 'spending', currency: 'RUB',
  icon: null, initialBalance: 10000, initialBalanceDate: '2026-09-01', members,
  balance: { native: 12500, display: 12500, totalNative: 12500, totalDisplay: 12500, displayCurrency: 'RUB' },
  createdAt: '2026-09-01', updatedAt: '2026-09-01',
}
const category = { id: 'layout-category', userId: user.id, name: 'Продукты', type: 'expense', icon: 'preset:groceries', createdAt: '2026-09-08T00:00:00Z' }
let categories = state === 'empty' ? [] : [category]
const transaction = {
  id: 'layout-transaction', accountId: account.id, toAccountId: null, toAmount: null, type: 'expense', amount: 1234.56,
  currency: 'RUB', exchangeRate: null, defaultCurrency: 'RUB', defaultCurrencyAmount: 1234.56,
  categoryId: category.id, description: 'Покупки для семьи', date: '2026-09-08', includeInBalance: true,
  createdBy: user.id, createdAt: '2026-09-08', shares: [{ userId: user.id, amount: 1234.56, isCustom: false }],
  tags: [{ id: 'layout-tag', name: 'дом' }],
}
const currencies = [{ code: 'RUB', name: 'Российский рубль', symbol: '₽', isActive: true, rateToUsd: 90 }]

axios.defaults.adapter = async (config) => {
  if (state === 'loading') return new Promise(() => {})
  if (state === 'error') throw new Error('Layout fixture: API unavailable')
  const url = (config.url || '').split('?')[0].replace(/^\/api/, '')
  let data: unknown = []
  if (url === '/categories' && config.method === 'post') {
    const body = JSON.parse(config.data)
    const created = { ...category, ...body, id: `layout-category-${categories.length + 1}` }
    categories.push(created)
    data = created
  } else if (url.startsWith('/categories/') && config.method === 'patch') {
    const id = url.split('/').pop()
    categories = categories.map((item) => item.id === id ? { ...item, ...JSON.parse(config.data) } : item)
    data = categories.find((item) => item.id === id)
  } else if (url.startsWith('/categories/') && config.method === 'delete') {
    categories = categories.filter((item) => item.id !== url.split('/').pop())
    data = null
  } else if (url === '/categories') data = categories.filter((item) => item.type === config.params?.type)
  else if (url === '/analytics/summary') data = { balance: 12500, expenses: 1234.56, income: 20000 }
  else if (url === '/analytics/by-category') data = state === 'empty' ? [] : [{ categoryId: category.id, categoryName: category.name, icon: category.icon, amount: 1234.56 }]
  else if (url === '/currencies' || url === '/admin/currencies') data = currencies
  else if (url.startsWith('/invites/')) data = { email: user.email }
  else if (url === '/accounts/layout-account') data = account
  else if (url.endsWith('/members')) data = state === 'empty' ? [] : members
  else if (url === '/transactions/layout-transaction') data = state === 'empty' ? null : transaction
  else if (state !== 'empty') {
    if (url === '/accounts') data = [account]
    else if (url === '/transactions') data = Array.from({ length: 12 }, (_, i) => ({ ...transaction, id: `layout-${i}` }))
    else if (url === '/tags') data = [{ id: 'layout-tag', name: 'дом', txCount: 12 }]
    else if (url === '/users' || url === '/admin/users') data = [user]
    else if (url === '/admin/invites') data = [{ id: 'layout-invite', email: 'invite@example.test', token: 'fixture', createdBy: user.id, createdAt: '2026-09-08', expiresAt: '2099-09-15' }]
  }
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'layout-fixture', refreshToken: 'layout-fixture', user }, version: 0 }))
localStorage.setItem('theme-preference', JSON.stringify({ state: { mode: params.get('theme') || 'light' }, version: 0 }))
history.replaceState(null, '', path)
await import('../../src/main')
