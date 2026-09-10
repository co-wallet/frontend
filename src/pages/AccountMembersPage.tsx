import { PageHeader } from '@/components/layout/PageHeader'
import { AppContent } from '@/components/layout/AppContent'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { IonPage, IonList, IonItem, IonLabel, IonNote, IonSpinner, IonText } from '@ionic/react'
import { accountsApi } from '@/api/accounts'
import { ACCOUNT_CONFIGURATION_NOTE } from '@/lib/accountMembers'

export function AccountMembersPage() {
  const { accountID } = useParams<{ accountID: string }>()
  const { data: account, isError: accountError } = useQuery({
    queryKey: ['account', accountID], queryFn: () => accountsApi.get(accountID),
  })
  const { data: members = [], isLoading, isError } = useQuery({
    queryKey: ['account-members', accountID], queryFn: () => accountsApi.getMembers(accountID),
  })
  return <IonPage>
    <PageHeader title="Участники и доли" backHref="/accounts" />
    <AppContent>
      {account && <h2>{account.name}</h2>}
      <IonNote className="entity-form-note">{ACCOUNT_CONFIGURATION_NOTE}</IonNote>
      {isLoading ? <div className="app-state"><IonSpinner /></div>
        : isError || accountError ? <IonText color="danger"><p>Не удалось загрузить участников счёта.</p></IonText>
        : <IonList>{members.map((member) => <IonItem key={member.userId}>
          <IonLabel><h2>{member.username}</h2>{member.userId === account?.ownerId && <p>Владелец</p>}</IonLabel>
          <IonNote slot="end">{Number((member.defaultShare * 100).toFixed(2))}%</IonNote>
        </IonItem>)}</IonList>}
    </AppContent>
  </IonPage>
}
