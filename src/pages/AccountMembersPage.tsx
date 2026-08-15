import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonInput, IonNote,
  IonSpinner, IonText, IonModal, IonAlert,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonFab, IonFabButton, IonSearchbar,
} from '@ionic/react'
import { addOutline, trashOutline, personOutline } from 'ionicons/icons'
import { accountsApi } from '@/api/accounts'
import { authApi, type UserSummary } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { parseDecimal, filterDecimalInput } from '@/lib/decimal'

export function AccountMembersPage() {
  const { accountID } = useParams<{ accountID: string }>()
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)
  const [search, setSearch] = useState('')
  const [share, setShare] = useState('0.5')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [shareInputs, setShareInputs] = useState<Record<string, string>>({})
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<{ userId: string; username: string; newOwnerShare: number } | null>(null)

  const originalSharesRef = useRef<Record<string, string>>({})

  const { data: account } = useQuery({
    queryKey: ['account', accountID],
    queryFn: () => accountsApi.get(accountID!),
  })

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['account-members', accountID],
    queryFn: () => accountsApi.getMembers(accountID!),
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.listUsers,
    staleTime: 60_000,
  })

  useEffect(() => {
    setShareInputs((prev) => {
      const next = { ...prev }
      members.forEach((m) => {
        if (!(m.userId in next)) next[m.userId] = String(m.defaultShare)
      })
      return next
    })
  }, [members])

  const memberIds = useMemo(() => new Set(members.map((m) => m.userId)), [members])
  const availableUsers = useMemo(
    () => allUsers.filter((u) => !memberIds.has(u.id)),
    [allUsers, memberIds],
  )
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? availableUsers.filter(
          (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
        )
      : availableUsers
  }, [availableUsers, search])

  function recalcOtherShares(
    changedUserId: string,
    newVal: string,
    currentInputs: Record<string, string>,
    allMembers: typeof members,
  ): Record<string, string> {
    const newShare = parseDecimal(newVal)
    const others = allMembers.filter((m) => m.userId !== changedUserId)
    const othersSum = others.reduce(
      (s, m) => s + parseDecimal(currentInputs[m.userId] ?? String(m.defaultShare)),
      0,
    )
    const remaining = Math.max(0, 1 - newShare)
    const next: Record<string, string> = { ...currentInputs, [changedUserId]: newVal }
    if (others.length === 0) return next
    if (othersSum > 0.0001) {
      others.forEach((m) => {
        const cur = parseDecimal(currentInputs[m.userId] ?? String(m.defaultShare))
        next[m.userId] = String(Math.round((cur * remaining / othersSum) * 10000) / 10000)
      })
    } else {
      const each = Math.round((remaining / others.length) * 10000) / 10000
      others.forEach((m) => { next[m.userId] = String(each) })
    }
    return next
  }

  function previewWithNewMember(newShareVal: string, origShares: Record<string, string>) {
    const newShare = parseDecimal(newShareVal)
    const remaining = Math.max(0, 1 - newShare)
    const existingTotal = members.reduce(
      (s, m) => s + parseDecimal(origShares[m.userId] ?? String(m.defaultShare)),
      0,
    )
    if (members.length === 0) return
    const preview: Record<string, string> = {}
    if (existingTotal > 0.0001) {
      members.forEach((m) => {
        const orig = parseDecimal(origShares[m.userId] ?? String(m.defaultShare))
        preview[m.userId] = String(Math.round((orig * remaining / existingTotal) * 10000) / 10000)
      })
    } else {
      const each = Math.round((remaining / members.length) * 10000) / 10000
      members.forEach((m) => { preview[m.userId] = String(each) })
    }
    setShareInputs((prev) => ({ ...prev, ...preview }))
  }

  function openAddForm() {
    const orig = { ...shareInputs }
    originalSharesRef.current = orig
    previewWithNewMember('0.5', orig)
    setShowForm(true)
  }

  function closeAddForm() {
    setShareInputs(originalSharesRef.current)
    setShowForm(false)
    setError('')
    setSelectedUser(null)
    setSearch('')
    setShare('0.5')
  }

  const addMutation = useMutation({
    mutationFn: () => accountsApi.addMember(accountID!, selectedUser!.username, parseDecimal(share)),
    onSuccess: async () => {
      const newMemberShare = parseDecimal(share)
      const remaining = 1 - newMemberShare
      const orig = originalSharesRef.current
      const existingTotal = members.reduce(
        (s, m) => s + parseDecimal(orig[m.userId] ?? String(m.defaultShare)),
        0,
      )
      if (members.length > 0 && existingTotal > 0.0001) {
        await Promise.all(
          members.map((m) => {
            const origShare = parseDecimal(orig[m.userId] ?? String(m.defaultShare))
            const updated = Math.round((origShare * remaining / existingTotal) * 10000) / 10000
            return accountsApi.updateMember(accountID!, m.userId, updated)
          }),
        )
      }
      qc.invalidateQueries({ queryKey: ['account-members', accountID] })
      setSelectedUser(null)
      setSearch('')
      setShare('0.5')
      setShowForm(false)
      setError('')
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      setError(e.response?.data?.error ?? 'Ошибка')
    },
  })

  const updateShareMutation = useMutation({
    mutationFn: ({ userId, newShare }: { userId: string; newShare: number }) =>
      accountsApi.updateMember(accountID!, userId, newShare),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-members', accountID] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: ({ userId }: { userId: string; newOwnerShare: number }) =>
      accountsApi.removeMember(accountID!, userId),
    onSuccess: async (_, { userId, newOwnerShare }) => {
      const ownerId = account?.ownerId
      if (ownerId) {
        await accountsApi.updateMember(accountID!, ownerId, newOwnerShare)
      }
      setShareInputs((prev) => {
        const next = { ...prev, ...(ownerId ? { [ownerId]: String(newOwnerShare) } : {}) }
        delete next[userId]
        return next
      })
      qc.invalidateQueries({ queryKey: ['account-members', accountID] })
    },
  })

  const isOwner = account?.ownerId === currentUser?.id

  function handleRemoveMember(m: typeof members[0]) {
    const removedShare = parseDecimal(shareInputs[m.userId] ?? String(m.defaultShare))
    const ownerMember = members.find((mem) => mem.userId === account?.ownerId)
    const ownerCurrentShare = parseDecimal(
      shareInputs[ownerMember?.userId ?? ''] ?? String(ownerMember?.defaultShare ?? 0),
    )
    const newOwnerShare = Math.round((ownerCurrentShare + removedShare) * 10000) / 10000
    setMemberToDelete({ userId: m.userId, username: m.username, newOwnerShare })
    setShowDeleteAlert(true)
  }

  if (isLoading) {
    return (
      <IonPage>
        <IonHeader><IonToolbar><IonTitle>Участники</IonTitle></IonToolbar></IonHeader>
        <IonContent className="ion-padding" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}><IonSpinner /></div>
        </IonContent>
      </IonPage>
    )
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/accounts/${accountID}`} text="Назад" />
          </IonButtons>
          <IonTitle>Участники</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {account && (
          <IonNote style={{ display: 'block', marginBottom: '1rem' }}>
            Счёт: <strong>{account.name}</strong>
          </IonNote>
        )}

        <IonList>
          {members.map((m) => (
            <IonItemSliding key={m.userId}>
              <IonItem>
                <IonIcon icon={personOutline} slot="start" />
                <IonLabel>
                  <h2>{m.username}</h2>
                  {account?.ownerId === m.userId && (
                    <p>Владелец</p>
                  )}
                </IonLabel>
                <IonInput
                  type="text"
                  inputMode="decimal"
                  value={shareInputs[m.userId] ?? String(m.defaultShare)}
                  disabled={!isOwner || showForm}
                  style={{ maxWidth: '80px', textAlign: 'center' }}
                  onIonInput={(e) => {
                    const newVal = filterDecimalInput(e.detail.value ?? '')
                    setShareInputs((prev) => recalcOtherShares(m.userId, newVal, prev, members))
                  }}
                  onIonBlur={() => {
                    const changed = members.filter((member) => {
                      const input = parseDecimal(shareInputs[member.userId] ?? String(member.defaultShare))
                      return Math.abs(input - member.defaultShare) > 0.0001
                    })
                    changed.forEach((member) => {
                      updateShareMutation.mutate({
                        userId: member.userId,
                        newShare: parseDecimal(shareInputs[member.userId] ?? String(member.defaultShare)),
                      })
                    })
                  }}
                  slot="end"
                />
              </IonItem>
              {isOwner && account?.ownerId !== m.userId && (
                <IonItemOptions side="end">
                  <IonItemOption color="danger" onClick={() => handleRemoveMember(m)}>
                    <IonIcon slot="icon-only" icon={trashOutline} />
                  </IonItemOption>
                </IonItemOptions>
              )}
            </IonItemSliding>
          ))}
        </IonList>

        {isOwner && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={openAddForm}>
              <IonIcon icon={addOutline} />
            </IonFabButton>
          </IonFab>
        )}

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => { setShowDeleteAlert(false); setMemberToDelete(null) }}
          header="Удалить участника"
          message={memberToDelete ? `Удалить ${memberToDelete.username}? Доля будет передана владельцу.` : ''}
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            {
              text: 'Удалить',
              role: 'destructive',
              handler: () => {
                if (memberToDelete) {
                  removeMutation.mutate({ userId: memberToDelete.userId, newOwnerShare: memberToDelete.newOwnerShare })
                }
              },
            },
          ]}
        />

        <IonModal isOpen={showForm} onDidDismiss={closeAddForm}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Добавить участника</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeAddForm}>Закрыть</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {error && (
              <IonText color="danger">
                <p style={{ marginBottom: '0.5rem' }}>{error}</p>
              </IonText>
            )}

            <IonSearchbar
              value={selectedUser ? `${selectedUser.username} (${selectedUser.email})` : search}
              placeholder="Поиск по имени или email..."
              onIonInput={(e) => {
                setSearch(e.detail.value ?? '')
                setSelectedUser(null)
              }}
              debounce={0}
            />

            {!selectedUser && filteredUsers.length > 0 && (
              <IonList>
                {filteredUsers.map((u) => (
                  <IonItem
                    key={u.id}
                    button
                    onClick={() => {
                      setSelectedUser(u)
                      setSearch('')
                    }}
                  >
                    <IonLabel>
                      <h2>{u.username}</h2>
                      <p>{u.email}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}

            {!selectedUser && search && filteredUsers.length === 0 && (
              <IonText color="medium">
                <p style={{ textAlign: 'center', marginTop: '1rem' }}>Пользователи не найдены</p>
              </IonText>
            )}

            <IonList style={{ marginTop: '1rem' }}>
              <IonItem>
                <IonLabel position="stacked">Доля по умолчанию (0–1)</IonLabel>
                <IonInput
                  type="text"
                  inputMode="decimal"
                  value={share}
                  onIonInput={(e) => {
                    const newVal = filterDecimalInput(e.detail.value ?? '')
                    setShare(newVal)
                    previewWithNewMember(newVal, originalSharesRef.current)
                  }}
                />
              </IonItem>
            </IonList>

            <IonButton
              expand="block"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !selectedUser}
              style={{ marginTop: '1rem' }}
            >
              {addMutation.isPending ? <IonSpinner name="crescent" /> : 'Добавить'}
            </IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  )
}
