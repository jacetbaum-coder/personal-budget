import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import PayPeriodsPage from './pages/PayPeriodsPage'
import ForecastPage from './pages/ForecastPage'
import AccountsPage from './pages/AccountsPage'
import MoneyMoverPage from './pages/MoneyMoverPage'
import TransactionInboxPage from './pages/TransactionInboxPage'
import TransactionHistoryPage from './pages/TransactionHistoryPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pay-periods" element={<PayPeriodsPage />} />
        <Route path="/forecast" element={<ForecastPage />} />
        <Route path="/money-mover" element={<MoneyMoverPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/transactions" element={<TransactionInboxPage />} />
        <Route path="/history" element={<TransactionHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}

export default App
