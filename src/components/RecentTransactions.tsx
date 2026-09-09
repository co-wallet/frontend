import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useHistory } from 'react-router-dom'
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonItem, IonLabel, IonList, IonSkeletonText,
} from '@ionic/react'
import type { Account } from '@/api/accounts'
import { categoriesApi } from '@/api/categories'
import { transactionsApi } from '@/api/transactions'
import { useRecentTransactionsFit } from '@/lib/useRecentTransactionsFit'
import { formatTransactionDate } from '@/lib/transactionList'
import './RecentTransactions.css'
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
  const filter = { accountIds, page: 1, limit: 20 }
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
  const fit = useRecentTransactionsFit(transactions.data, `${enabled}:${loading}:${error}`)
  const items = enabled ? (transactions.data ?? []) : []

  return (
    <div className="recent-transactions-slot">
      <IonCard ref={fit.ref} className={`recent-transactions${fit.compact ? ' recent-transactions--compact' : ''}${fit.hidden ? ' recent-transactions--hidden' : ''}`} aria-hidden={fit.hidden || undefined}>
        <IonCardHeader className="recent-transactions__header">
          <IonCardTitle style={{ fontSize: '1rem' }}>Последние транзакции</IonCardTitle>
        </IonCardHeader>
        {loading ? (
          <IonList className="recent-transactions__message" aria-label="Загрузка последних транзакций">
            {[0, 1, 2].map((key) => (
              <IonItem key={key}>
                <IonLabel><IonSkeletonText animated style={{ width: '70%', height: 48 }} /></IonLabel>
              </IonItem>
            ))}
          </IonList>
        ) : error ? (
          <IonCardContent className="recent-transactions__message" role="alert">
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
          <IonCardContent className="recent-transactions__message">По выбранным счетам пока нет транзакций.</IonCardContent>
        ) : (
          <IonList aria-label="Последние транзакции">
            {items.map((tx, index) => (
              <div key={tx.id}
                className={`recent-transactions__row${index >= fit.count ? ' recent-transactions__row--hidden' : ''}`}
                aria-hidden={index >= fit.count || undefined}
              >
                {(index === 0 || tx.date.slice(0, 10) !== items[index - 1].date.slice(0, 10)) && (
                  <h3 className="recent-transactions__date">{formatTransactionDate(tx.date.slice(0, 10))}</h3>
                )}
                <TransactionItem
                  tx={tx}
                  account={accounts.find((account) => account.id === tx.accountId)}
                  toAccount={accounts.find((account) => account.id === tx.toAccountId)}
                  category={categories.find((category) => category.id === tx.categoryId)}
                  currentUserId={currentUserId}
                  defaultCurrency={defaultCurrency}
                  showTags={false}
                  onEdit={(id) => history.push(`/transactions/${id}/edit`)}
                />
              </div>
            ))}
          </IonList>
        )}
        <IonCardContent className="recent-transactions__footer">
          <IonButton expand="block" fill="clear" routerLink="/transactions" routerDirection="forward">
            Все транзакции
          </IonButton>
        </IonCardContent>
      </IonCard>
    </div>
  )
}
