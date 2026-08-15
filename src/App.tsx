import { Redirect, Route } from 'react-router-dom'
import { IonRouterOutlet } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { LoginPage } from '@/pages/LoginPage'
import { InvitePage } from '@/pages/InvitePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { AccountDetailPage } from '@/pages/AccountDetailPage'
import { AccountMembersPage } from '@/pages/AccountMembersPage'
import CategoriesPage from '@/pages/CategoriesPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { AddTransactionPage } from '@/pages/AddTransactionPage'
import { EditTransactionPage } from '@/pages/EditTransactionPage'
import { TagsPage } from '@/pages/TagsPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminCurrenciesPage } from '@/pages/admin/AdminCurrenciesPage'
import { AdminInvitesPage } from '@/pages/admin/AdminInvitesPage'
import { ProtectedRoute, AdminRoute } from '@/components/layout/ProtectedRoute'
import { AppMenu } from '@/components/AppMenu'

function App() {
  return (
    <IonReactRouter>
      <AppMenu />
      <IonRouterOutlet id="main-content">
        {/* Public */}
        <Route exact path="/login" component={LoginPage} />
        <Route exact path="/invite/:token" component={InvitePage} />

        {/* Protected */}
        <Route exact path="/dashboard">
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        </Route>
        <Route exact path="/accounts">
          <ProtectedRoute><AccountsPage /></ProtectedRoute>
        </Route>
        <Route exact path="/accounts/:accountID">
          <ProtectedRoute><AccountDetailPage /></ProtectedRoute>
        </Route>
        <Route exact path="/accounts/:accountID/members">
          <ProtectedRoute><AccountMembersPage /></ProtectedRoute>
        </Route>
        <Route exact path="/categories">
          <ProtectedRoute><CategoriesPage /></ProtectedRoute>
        </Route>
        <Route exact path="/transactions">
          <ProtectedRoute><TransactionsPage /></ProtectedRoute>
        </Route>
        <Route exact path="/transactions/add">
          <ProtectedRoute><AddTransactionPage /></ProtectedRoute>
        </Route>
        <Route exact path="/transactions/:txID/edit">
          <ProtectedRoute><EditTransactionPage /></ProtectedRoute>
        </Route>
        <Route exact path="/tags">
          <ProtectedRoute><TagsPage /></ProtectedRoute>
        </Route>

        {/* Admin */}
        <Route exact path="/admin">
          <AdminRoute><AdminPage /></AdminRoute>
        </Route>
        <Route exact path="/admin/users">
          <AdminRoute><AdminUsersPage /></AdminRoute>
        </Route>
        <Route exact path="/admin/currencies">
          <AdminRoute><AdminCurrenciesPage /></AdminRoute>
        </Route>
        <Route exact path="/admin/invites">
          <AdminRoute><AdminInvitesPage /></AdminRoute>
        </Route>

        {/* Default */}
        <Route exact path="/">
          <Redirect to="/dashboard" />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  )
}

export default App
