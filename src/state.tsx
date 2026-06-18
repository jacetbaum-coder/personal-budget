import { createContext, useContext, useMemo, useState } from 'react'
import {
  Account,
  PayPeriod,
  RecurringExpense,
  ForecastPoint,
  TransactionRecord,
  sampleAccounts,
  samplePayPeriods,
  sampleRecurringExpenses,
  sampleForecastPoints
} from './models'
import {
  calculateAvailableSpending,
  calculateProjectedLeftover,
  calculateSafetyBuffer
} from './calculations'
import { getRecurringExpenseTotals, getUpcomingOccurrences } from './recurring'

export interface AppState {
  accounts: Account[]
  payPeriods: PayPeriod[]
  recurringExpenses: RecurringExpense[]
  forecastPoints: ForecastPoint[]
  transactions: TransactionRecord[]
  selectedPayPeriodId: number
  selectedForecastPointId: number
  extraMoney: number
  selectedMoverDestination: Account['id']
  dashboardHeading: string
  dashboardButtonText: string
  defaultPayPeriodLabel: string
  defaultPaycheckAmount: number
  currency: string
  selectedPayDate: string
  forecastHorizon: number
  notifications: { email: boolean; push: boolean }
  setAccounts: (accounts: Account[]) => void
  setPayPeriods: (payPeriods: PayPeriod[]) => void
  setRecurringExpenses: (expenses: RecurringExpense[] | ((current: RecurringExpense[]) => RecurringExpense[])) => void
  setTransactions: (transactions: TransactionRecord[] | ((current: TransactionRecord[]) => TransactionRecord[])) => void
  setSelectedPayDate: (date: string) => void
  setSelectedPayPeriodId: (id: number) => void
  setSelectedForecastPointId: (id: number) => void
  setExtraMoney: (amount: number) => void
  setSelectedMoverDestination: (destination: Account['id']) => void
  setDashboardHeading: (heading: string) => void
  setDashboardButtonText: (text: string) => void
  setDefaultPayPeriodLabel: (label: string) => void
  setDefaultPaycheckAmount: (amount: number) => void
  setCurrency: (currency: string) => void
  setForecastHorizon: (horizon: number) => void
  setNotifications: (notifications: { email: boolean; push: boolean }) => void
  getProjectedLeftover: (payPeriod: PayPeriod, totals: ReturnType<typeof getRecurringExpenseTotals>) => number
  getAvailableSpending: (leftover: number) => number
  getSafetyBuffer: (leftover: number) => number
  getCashAppTransfer: (totals: ReturnType<typeof getRecurringExpenseTotals>) => number
  getRecurringTotals: (periodIndex: number) => ReturnType<typeof getRecurringExpenseTotals>
  getUpcomingRecurring: (periodIndex: number, count: number) => ReturnType<typeof getUpcomingOccurrences>
}

const AppStateContext = createContext<AppState | undefined>(undefined)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(sampleAccounts)
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>(samplePayPeriods)
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(sampleRecurringExpenses)
  const [forecastPoints] = useState<ForecastPoint[]>(sampleForecastPoints)
  const [transactions, rawSetTransactions] = useState<TransactionRecord[]>([])
  const [selectedPayPeriodId, setSelectedPayPeriodId] = useState<number>(1)
  const [selectedForecastPointId, setSelectedForecastPointId] = useState<number>(4)
  const [extraMoney, setExtraMoney] = useState<number>(520)
  const [selectedMoverDestination, setSelectedMoverDestination] = useState<Account['id']>('checking')
  const [dashboardHeading, setDashboardHeading] = useState<string>('Your future cashflow at a glance')
  const [dashboardButtonText, setDashboardButtonText] = useState<string>('New allocation')
  const [defaultPayPeriodLabel, setDefaultPayPeriodLabel] = useState<string>('Biweekly')
  const [defaultPaycheckAmount, setDefaultPaycheckAmount] = useState<number>(samplePayPeriods[0]?.payAmount ?? 0)
  const [currency, setCurrency] = useState<string>('USD')
  const [selectedPayDate, setSelectedPayDate] = useState<string>('2026-06-28')
  const [forecastHorizon, setForecastHorizon] = useState<number>(30)
  const [notifications, setNotifications] = useState<{ email: boolean; push: boolean }>({
    email: false,
    push: true
  })

  // Wrapper to handle both value and function patterns
  const wrappedSetRecurringExpenses = (expenses: RecurringExpense[] | ((current: RecurringExpense[]) => RecurringExpense[])) => {
    if (typeof expenses === 'function') {
      setRecurringExpenses((current) => expenses(current))
    } else {
      setRecurringExpenses(expenses)
    }
  }

  const wrappedSetTransactions = (transactions: TransactionRecord[] | ((current: TransactionRecord[]) => TransactionRecord[])) => {
    if (typeof transactions === 'function') {
      rawSetTransactions((current) => transactions(current))
    } else {
      rawSetTransactions(transactions)
    }
  }

  const getRecurringTotals = (periodIndex: number) => getRecurringExpenseTotals(recurringExpenses, periodIndex)
  const getUpcomingRecurring = (periodIndex: number, count: number) => getUpcomingOccurrences(recurringExpenses, periodIndex, count)

  const getProjectedLeftover = (payPeriod: PayPeriod, totals: ReturnType<typeof getRecurringExpenseTotals>) =>
    calculateProjectedLeftover(
      payPeriod.payAmount,
      payPeriod.transfers.rent,
      payPeriod.transfers.openbank,
      totals.fromSavings
    )

  const getSafetyBuffer = (leftover: number) => calculateSafetyBuffer(leftover)
  const getAvailableSpending = (leftover: number) => calculateAvailableSpending(leftover, calculateSafetyBuffer(leftover))
  const getCashAppTransfer = (totals: ReturnType<typeof getRecurringExpenseTotals>) => totals.fromCashApp

  const value = useMemo(
    () => ({
      accounts,
      payPeriods,
      recurringExpenses,
      forecastPoints,
      transactions,
      selectedPayPeriodId,
      selectedForecastPointId,
      extraMoney,
      selectedMoverDestination,
      dashboardHeading,
      dashboardButtonText,
      defaultPayPeriodLabel,
      defaultPaycheckAmount,
      currency,
      selectedPayDate,
      forecastHorizon,
      notifications,
      setAccounts,
      setPayPeriods,
      setRecurringExpenses: wrappedSetRecurringExpenses,
      setTransactions: wrappedSetTransactions,
      setSelectedPayDate,
      setSelectedPayPeriodId,
      setSelectedForecastPointId,
      setExtraMoney,
      setSelectedMoverDestination,
      setDashboardHeading,
      setDashboardButtonText,
      setDefaultPayPeriodLabel,
      setDefaultPaycheckAmount,
      setCurrency,
      setForecastHorizon,
      setNotifications,
      getProjectedLeftover,
      getAvailableSpending,
      getSafetyBuffer,
      getCashAppTransfer,
      getRecurringTotals,
      getUpcomingRecurring
    }),
    [
      accounts,
      payPeriods,
      recurringExpenses,
      forecastPoints,
      transactions,
      selectedPayPeriodId,
      selectedForecastPointId,
      extraMoney,
      selectedMoverDestination,
      dashboardHeading,
      dashboardButtonText,
      defaultPayPeriodLabel,
      defaultPaycheckAmount,
      currency,
      selectedPayDate,
      forecastHorizon,
      notifications
    ]
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const state = useContext(AppStateContext)
  if (!state) {
    throw new Error('useAppState must be used within AppStateProvider')
  }

  return state
}
