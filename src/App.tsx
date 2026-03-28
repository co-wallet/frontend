import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { AccountDetailPage } from '@/pages/AccountDetailPage'
import { AccountMembersPage } from '@/pages/AccountMembersPage'
import CategoriesPage from '@/pages/CategoriesPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { AddTransactionPage } from '@/pages/AddTransactionPage'
import { EditTransactionPage } from '@/pages/EditTransactionPage'
import { TagsPage } from '@/pages/TagsPage'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/:accountID" element={<AccountDetailPage />} />
          <Route path="/accounts/:accountID/members" element={<AccountMembersPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/add" element={<AddTransactionPage />} />
          <Route path="/transactions/:txID/edit" element={<EditTransactionPage />} />
          <Route path="/tags" element={<TagsPage />} />
        </Route>

        {/* Default */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
