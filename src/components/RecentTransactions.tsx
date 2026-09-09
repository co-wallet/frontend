import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useHistory } from 'react-router-dom'
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonItem, IonLabel, IonList, IonSkeletonText,
} from '@ionic/react'
import type { Account } from '@/api/accounts'
import { categoriesApi } from '@/api/categories'
import { transactionsApi } from '@/api/transactions'
import { TransactionItem } from './TransactionItem'

interface RecentTransactionsProps {
  accounts: Account[]
  accountIds: string[]
  accountsLoading: boolean
  accountsError?: boolean
  currentUserId?: string
  defaultCurrency: string
}

export function RecentTransactions({
  accounts, accountIds, accountsLoading, accountsError, currentUserId, defaultCurrency,
}: RecentTransactionsProps) {
  const history = useHistory()
  const queryClient = useQueryClient()
  const enabled = !accountsLoading && !accountsError && accountIds.length > 0
  const filter = { accountIds, page: 1, limit: 3 }
  const transactions = useQuery({
    queryKey: ['transactions', 'recent', filter],
    queryFn: () => transactionsApi.list(filter),
    enabled,
  })
  const expenseCategories = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => categoriesApi.list('expense'),
    enabled,
  })
  const incomeCategories = useQuery({
    queryKey: ['categories', 'income'],
    queryFn: () => categoriesApi.list('income'),
    enabled,
  })
  const categories = [...(expenseCategories.data ?? []), ...(incomeCategories.data ?? [])]
  const loading = accountsLoading || (enabled && (
    transactions.isLoading || expenseCategories.isLoading || incomeCategories.isLoading
  ))
  const error = accountsError || (enabled && (
    transactions.isError || expenseCategories.isError || incomeCategories.isError
  ))
  const items = enabled ? (transactions.data ?? []).slice(0, 3) : []

  return (
    <IonCard style={{ margin: '16px 0 0' }}>
      <IonCardHeader>
        <IonCardTitle style={{ fontSize: '1rem' }}>Последние транзакции</IonCardTitle>
      </IonCardHeader>
      {loading ? (
        <IonList aria-label="Загрузка последних транзакций">
          {[0, 1, 2].map((key) => (
            <IonItem key={key}>
              <IonLabel><IonSkeletonText animated style={{ width: '70%', height: 48 }} /></IonLabel>
            </IonItem>
          ))}
        </IonList>
      ) : error ? (
        <IonCardContent role="alert">
          Не удалось загрузить последние транзакции.
          <IonButton fill="clear" onClick={() => {
            if (accountsError) void queryClient.invalidateQueries({ queryKey: ['accounts'] })
            if (enabled) {
              void transactions.refetch()
              void expenseCategories.refetch()
              void incomeCategories.refetch()
            }
          }}>Повторить</IonButton>
        </IonCardContent>
      ) : items.length === 0 ? (
        <IonCardContent>По выбранным счетам пока нет транзакций.</IonCardContent>
      ) : (
        <IonList aria-label="Последние транзакции">
          {items.map((tx) => (
            <TransactionItem
              key={tx.id}
              tx={tx}
              account={accounts.find((account) => account.id === tx.accountId)}
              toAccount={accounts.find((account) => account.id === tx.toAccountId)}
              category={categories.find((category) => category.id === tx.categoryId)}
              currentUserId={currentUserId}
              defaultCurrency={defaultCurrency}
              showDate
              onEdit={(id) => history.push(`/transactions/${id}/edit`)}
            />
          ))}
        </IonList>
      )}
      <IonCardContent>
        <IonButton expand="block" fill="clear" routerLink="/transactions" routerDirection="forward">
          Все транзакции
        </IonButton>
      </IonCardContent>
    </IonCard>
  )
}
