import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  clearLocalPersistedState,
  createDefaultPersistedState,
  isRemotePersistenceConfigured,
  loadLocalPersistedState,
  loadRemotePersistedState,
  mergePersistedState,
  saveLocalPersistedState,
  saveRemotePersistedState,
  type PersistedAppStateData
} from './services/appStatePersistence'

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
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'local-only'
  lastSavedAt: string | null
  remotePersistenceEnabled: boolean
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
  getSafetyBuffer: () => number
  getCashAppTransfer: (totals: ReturnType<typeof getRecurringExpenseTotals>) => number
  getRecurringTotals: (periodIndex: number) => ReturnType<typeof getRecurringExpenseTotals>
  getUpcomingRecurring: (periodIndex: number, count: number) => ReturnType<typeof getUpcomingOccurrences>
  syncNow: () => Promise<void>
  exportBackup: () => string
  importBackup: (raw: string) => { ok: true } | { ok: false; error: string }
  resetToDefaults: () => Promise<void>
}

const AppStateContext = createContext<AppState | undefined>(undefined)

const initialPersistedState = loadLocalPersistedState() ?? createDefaultPersistedState()

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(initialPersistedState.accounts)
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>(initialPersistedState.payPeriods)
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(initialPersistedState.recurringExpenses)
  const [forecastPoints] = useState<ForecastPoint[]>(sampleForecastPoints)
  const [transactions, rawSetTransactions] = useState<TransactionRecord[]>(initialPersistedState.transactions)
  const [selectedPayPeriodId, setSelectedPayPeriodId] = useState<number>(initialPersistedState.selectedPayPeriodId)
  const [selectedForecastPointId, setSelectedForecastPointId] = useState<number>(initialPersistedState.selectedForecastPointId)
  const [extraMoney, setExtraMoney] = useState<number>(initialPersistedState.extraMoney)
  const [selectedMoverDestination, setSelectedMoverDestination] = useState<Account['id']>(initialPersistedState.selectedMoverDestination)
  const [dashboardHeading, setDashboardHeading] = useState<string>(initialPersistedState.dashboardHeading)
  const [dashboardButtonText, setDashboardButtonText] = useState<string>(initialPersistedState.dashboardButtonText)
  const [defaultPayPeriodLabel, setDefaultPayPeriodLabel] = useState<string>(initialPersistedState.defaultPayPeriodLabel)
  const [defaultPaycheckAmount, setDefaultPaycheckAmount] = useState<number>(initialPersistedState.defaultPaycheckAmount)
  const [currency, setCurrency] = useState<string>(initialPersistedState.currency)
  const [selectedPayDate, setSelectedPayDate] = useState<string>(initialPersistedState.selectedPayDate)
  const [forecastHorizon, setForecastHorizon] = useState<number>(initialPersistedState.forecastHorizon)
  const [notifications, setNotifications] = useState<{ email: boolean; push: boolean }>(initialPersistedState.notifications)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'local-only'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const remotePersistenceEnabled = isRemotePersistenceConfigured()
  const hasHydratedRef = useRef(false)
  const saveTimeoutRef = useRef<number | null>(null)

  const buildPersistedState = (): PersistedAppStateData => ({
    schemaVersion: 1,
    accounts,
    payPeriods,
    recurringExpenses,
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
  })

  const applyPersistedState = (state: PersistedAppStateData) => {
    setAccounts(state.accounts)
    setPayPeriods(state.payPeriods)
    setRecurringExpenses(state.recurringExpenses)
    rawSetTransactions(state.transactions)
    setSelectedPayPeriodId(state.selectedPayPeriodId)
    setSelectedForecastPointId(state.selectedForecastPointId)
    setExtraMoney(state.extraMoney)
    setSelectedMoverDestination(state.selectedMoverDestination)
    setDashboardHeading(state.dashboardHeading)
    setDashboardButtonText(state.dashboardButtonText)
    setDefaultPayPeriodLabel(state.defaultPayPeriodLabel)
    setDefaultPaycheckAmount(state.defaultPaycheckAmount)
    setCurrency(state.currency)
    setSelectedPayDate(state.selectedPayDate)
    setForecastHorizon(state.forecastHorizon)
    setNotifications(state.notifications)
  }

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

  const getSafetyBuffer = () => calculateSafetyBuffer()
  const getAvailableSpending = (leftover: number) => calculateAvailableSpending(leftover)
  const getCashAppTransfer = (totals: ReturnType<typeof getRecurringExpenseTotals>) => totals.fromCashApp

  const syncNow = async () => {
    const snapshot = buildPersistedState()
    saveLocalPersistedState(snapshot)

    if (!remotePersistenceEnabled) {
      setSaveStatus('local-only')
      setLastSavedAt(new Date().toISOString())
      return
    }

    setSaveStatus('saving')
    try {
      const updatedAt = await saveRemotePersistedState(snapshot)
      setSaveStatus('saved')
      setLastSavedAt(updatedAt ?? new Date().toISOString())
    } catch {
      setSaveStatus('error')
    }
  }

  const exportBackup = () => JSON.stringify(buildPersistedState(), null, 2)

  const importBackup = (raw: string) => {
    try {
      const nextState = mergePersistedState(JSON.parse(raw))
      applyPersistedState(nextState)
      saveLocalPersistedState(nextState)
      setSaveStatus(remotePersistenceEnabled ? 'saving' : 'local-only')
      return { ok: true } as const
    } catch {
      return { ok: false as const, error: 'Backup file is not valid JSON for this app.' }
    }
  }

  const resetToDefaults = async () => {
    const defaults = createDefaultPersistedState()
    applyPersistedState(defaults)
    clearLocalPersistedState()
    saveLocalPersistedState(defaults)
    if (!remotePersistenceEnabled) {
      setSaveStatus('local-only')
      setLastSavedAt(new Date().toISOString())
      return
    }
    await syncNow()
  }

  useEffect(() => {
    let isCancelled = false

    const hydrate = async () => {
      if (!remotePersistenceEnabled) {
        hasHydratedRef.current = true
        setSaveStatus('local-only')
        return
      }

      try {
        const remoteState = await loadRemotePersistedState()
        if (!remoteState || isCancelled) {
          hasHydratedRef.current = true
          return
        }

        applyPersistedState(remoteState.data)
        saveLocalPersistedState(remoteState.data)
        setLastSavedAt(remoteState.updatedAt)
        setSaveStatus('saved')
      } catch {
        if (!isCancelled) {
          setSaveStatus('error')
        }
      } finally {
        if (!isCancelled) {
          hasHydratedRef.current = true
        }
      }
    }

    hydrate()

    return () => {
      isCancelled = true
    }
  }, [remotePersistenceEnabled])

  useEffect(() => {
    if (!hasHydratedRef.current) return

    const snapshot = buildPersistedState()
    saveLocalPersistedState(snapshot)

    if (!remotePersistenceEnabled) {
      setSaveStatus('local-only')
      setLastSavedAt(new Date().toISOString())
      return
    }

    setSaveStatus('saving')
    if (saveTimeoutRef.current != null) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const updatedAt = await saveRemotePersistedState(snapshot)
        setSaveStatus('saved')
        setLastSavedAt(updatedAt ?? new Date().toISOString())
      } catch {
        setSaveStatus('error')
      }
    }, 700)

    return () => {
      if (saveTimeoutRef.current != null) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [
    accounts,
    payPeriods,
    recurringExpenses,
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
    remotePersistenceEnabled
  ])

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
      saveStatus,
      lastSavedAt,
      remotePersistenceEnabled,
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
      getUpcomingRecurring,
      syncNow,
      exportBackup,
      importBackup,
      resetToDefaults
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
      notifications,
      saveStatus,
      lastSavedAt,
      remotePersistenceEnabled
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
