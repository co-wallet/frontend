import { type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfilePage } from './ProfilePage'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

const controls = vi.hoisted(() => ({ state: [] as unknown[], cursor: 0,
  inputs: new Map<string, (value: string) => void>(),
  forms: new Map<string, () => void>(), invalidate: vi.fn(),
}))
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const i = controls.cursor++
    if (!(i in controls.state)) controls.state[i] = initial
    return [controls.state[i], (next: unknown) => { controls.state[i] = next }]
  },
}))
vi.mock('@ionic/react', async (original) => {
  const actual = await original<typeof import('@ionic/react')>()
  return { ...actual, IonInput: (props: ComponentProps<typeof actual.IonInput>) => {
    controls.inputs.set(String(props.label), (value) => props.onIonInput?.({ detail: { value } } as Parameters<NonNullable<typeof props.onIonInput>>[0]))
    return <actual.IonInput {...props} />
  } }
})
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: controls.invalidate }) }))
vi.mock('@/store/authStore', async (original) => {
  const actual = await original<typeof import('@/store/authStore')>()
  return { useAuthStore: Object.assign((selector: (state: ReturnType<typeof actual.useAuthStore.getState>) => unknown) => selector(actual.useAuthStore.getState()), actual.useAuthStore) }
})
vi.mock('@/api/auth', () => ({ authApi: { updateMe: vi.fn() } }))
vi.mock('@/components/layout/AppContent', () => ({ AppContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('@/components/layout/PageHeader', () => ({ PageHeader: () => <header>Профиль</header> }))

// Capture real form submit handlers while preserving the JSX rendered by the page.
vi.mock('react/jsx-dev-runtime', async (original) => {
  const actual = await original<typeof import('react/jsx-dev-runtime')>()
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    if (args[0] === 'form') {
      const props = args[1] as Record<string, unknown>
      controls.forms.set(String(props['aria-label']), () => (props.onSubmit as (e: unknown) => void)({ preventDefault() {} }))
    }
    return actual.jsxDEV(...args)
  } }
})
const user = { id: 'u1', username: 'alice', email: 'a@test.com', defaultCurrency: 'RUB', isAdmin: false, isActive: true, createdAt: '', updatedAt: '' }
function render() {
  controls.cursor = 0
  controls.inputs.clear()
  return renderToStaticMarkup(<ProfilePage />)
}
async function submit(section: string) {
  controls.forms.get(section)!()
  await vi.waitFor(() => expect(controls.state[6]).toBe(null))
  return render()
}
beforeEach(() => {
  controls.state = []
  controls.forms.clear()
  vi.clearAllMocks()
  useAuthStore.setState({ user, token: 'access', refreshToken: 'refresh' })
})
describe('ProfilePage', () => {
  it('saves a trimmed name and updates the session user', async () => {
    render()
    controls.inputs.get('Имя')!(' Алиса ')
    render()
    vi.mocked(authApi.updateMe).mockResolvedValueOnce({ ...user, username: 'Алиса' })
    const markup = await submit('Личные данные')
    expect(authApi.updateMe).toHaveBeenCalledWith({ username: 'Алиса' })
    expect(useAuthStore.getState().user?.username).toBe('Алиса')
    expect(markup).toContain('Профиль сохранён')
    expect(controls.invalidate).toHaveBeenCalledWith({ queryKey: ['account-members'] })
  })
  it('requires the current password when changing email and clears it on success', async () => {
    render()
    controls.inputs.get('Почта')!(' NEW@Test.com ')
    let markup = render()
    expect(markup).toContain('Текущий пароль для смены почты')
    controls.inputs.get('Текущий пароль для смены почты')!('old-password')
    render()
    vi.mocked(authApi.updateMe).mockResolvedValueOnce({ ...user, email: 'new@test.com' })
    markup = await submit('Личные данные')
    expect(authApi.updateMe).toHaveBeenCalledWith({ email: 'new@test.com', currentPassword: 'old-password' })
    expect(markup).not.toContain('Текущий пароль для смены почты')
    expect(controls.state[2]).toBe('')
  })
  it('keeps the session and entered data when the API rejects a change', async () => {
    render()
    controls.inputs.get('Имя')!('taken')
    render()
    vi.mocked(authApi.updateMe).mockRejectedValueOnce({ response: { data: { error: 'Имя уже занято' } } })
    const markup = await submit('Личные данные')
    expect(markup).toContain('Имя уже занято')
    expect(useAuthStore.getState().user).toEqual(user)
    expect(controls.state[0]).toBe('taken')
  })
  it('rejects mismatching and short passwords before calling the API', async () => {
    render()
    controls.inputs.get('Текущий пароль')!('old-password')
    controls.inputs.get('Новый пароль')!('new-password')
    controls.inputs.get('Повторите новый пароль')!('different')
    render()
    expect(await submit('Смена пароля')).toContain('Пароли не совпадают')
    controls.inputs.get('Новый пароль')!('short')
    controls.inputs.get('Повторите новый пароль')!('short')
    render()
    expect(await submit('Смена пароля')).toContain('от 8 до 72')
    expect(authApi.updateMe).not.toHaveBeenCalled()
  })
  it('changes the password and clears all password inputs', async () => {
    render()
    controls.inputs.get('Имя')!('unsaved-name')
    controls.inputs.get('Текущий пароль')!('old-password')
    controls.inputs.get('Новый пароль')!('new-password')
    controls.inputs.get('Повторите новый пароль')!('new-password')
    render()
    vi.mocked(authApi.updateMe).mockResolvedValueOnce(user)
    expect(await submit('Смена пароля')).toContain('Пароль изменён')
    expect(authApi.updateMe).toHaveBeenCalledWith({ currentPassword: 'old-password', newPassword: 'new-password' })
    expect(controls.state.slice(3, 6)).toEqual(['', '', ''])
    expect(controls.state[0]).toBe('unsaved-name')
    expect(useAuthStore.getState().token).toBe('access')
  })
})
