import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  Account,
  AccountId,
  ExpenseSettlementStatus,
  PayPeriod,
  PeriodExpenseOverrides,
  RecurringExpense,
  ForecastPoint,
  MasterOverrideRecord,
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
import { getRecurringExpenseTotals, getUpcomingOccurrences, isRecurringExpenseDue } from './recurring'
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
  masterOverrideRecord: MasterOverrideRecord | null
  periodExpenseOverrides: PeriodExpenseOverrides
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
  applyMasterOverride: (input: {
    payPeriodId: number
    accountBalances: Record<AccountId, number>
    paidExpenseIds: number[]
    unpaidExpenseIds: number[]
    forcedSpendingMoneyTarget?: number
    reason?: string
    notes?: string
  }) => { ok: true } | { ok: false; error: string }
  clearMasterOverrideRecord: () => void
  getExpenseSettlementStatus: (payPeriodId: number, expenseId: number) => ExpenseSettlementStatus | null
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
  const [masterOverrideRecord, setMasterOverrideRecord] = useState<MasterOverrideRecord | null>(initialPersistedState.masterOverrideRecord)
  const [periodExpenseOverrides, setPeriodExpenseOverrides] = useState<PeriodExpenseOverrides>(initialPersistedState.periodExpenseOverrides)
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
    schemaVersion: 2,
    accounts,
    payPeriods,
    recurringExpenses,
    transactions,
    masterOverrideRecord,
    periodExpenseOverrides,
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
    setMasterOverrideRecord(state.masterOverrideRecord)
    setPeriodExpenseOverrides(state.periodExpenseOverrides)
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

  const getRecurringTotals = (periodIndex: number) => {
    const period = payPeriods[periodIndex]
    if (!period) return getRecurringExpenseTotals(recurringExpenses, periodIndex, payPeriods)

    const expenseOverrideMap = periodExpenseOverrides[period.id] ?? {}
    const totals = { fromSavings: 0, fromChecking: 0, fromCashApp: 0, groceries: 0, bus: 0 }

    for (const expense of recurringExpenses) {
      if (!isRecurringExpenseDue(expense, periodIndex, payPeriods)) continue
      if (expenseOverrideMap[expense.id] === 'paidAlready') continue

      const src = expense.sourceAccount ?? 'savings'
      if (src === 'savings') {
        totals.fromSavings += expense.amount
      } else if (src === 'checking') {
        totals.fromChecking += expense.amount
      } else if (src === 'cashApp') {
        totals.fromCashApp += expense.amount
        if (expense.category === 'groceries') totals.groceries += expense.amount
        if (expense.category === 'bus') totals.bus += expense.amount
      }
    }

    return totals
  }
  const getUpcomingRecurring = (periodIndex: number, count: number) => getUpcomingOccurrences(recurringExpenses, periodIndex, count, payPeriods)

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

  const applyMasterOverride: AppState['applyMasterOverride'] = ({
    payPeriodId,
    accountBalances,
    paidExpenseIds,
    unpaidExpenseIds,
    forcedSpendingMoneyTarget,
    reason,
    notes,
  }) => {
    const targetPeriod = payPeriods.find((period) => period.id === payPeriodId)
    if (!targetPeriod) {
      return { ok: false, error: 'Selected pay period was not found.' }
    }

    const cleanBalances = Object.entries(accountBalances).reduce<Record<string, number>>((acc, [accountId, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        acc[accountId] = value
      }
      return acc
    }, {})

    if (Object.keys(cleanBalances).length === 0) {
      return { ok: false, error: 'Enter at least one valid account balance.' }
    }

    const cleanPaidExpenseIds = paidExpenseIds.filter((id) => typeof id === 'number')
    const cleanUnpaidExpenseIds = unpaidExpenseIds.filter((id) => typeof id === 'number')

    const cleanSpendingTarget =
      typeof forcedSpendingMoneyTarget === 'number' && Number.isFinite(forcedSpendingMoneyTarget)
        ? Math.max(0, forcedSpendingMoneyTarget)
        : undefined

    setPayPeriods((current) =>
      current.map((period) =>
        period.id === payPeriodId
          ? {
              ...period,
              startingBalances: cleanBalances,
              spendingMoneyTarget: cleanSpendingTarget ?? period.spendingMoneyTarget,
              spendingMoneyLocked: cleanSpendingTarget != null ? true : period.spendingMoneyLocked,
            }
          : period
      )
    )

    setPeriodExpenseOverrides((current) => {
      const nextOverrides: Record<number, ExpenseSettlementStatus> = {}
      for (const expenseId of cleanUnpaidExpenseIds) {
        nextOverrides[expenseId] = 'unpaid'
      }
      for (const expenseId of cleanPaidExpenseIds) {
        nextOverrides[expenseId] = 'paidAlready'
      }

      return {
        ...current,
        [payPeriodId]: nextOverrides,
      }
    })

    setMasterOverrideRecord({
      payPeriodId,
      accountBalances: cleanBalances,
      paidExpenseIds: cleanPaidExpenseIds,
      unpaidExpenseIds: cleanUnpaidExpenseIds,
      forcedSpendingMoneyTarget: cleanSpendingTarget,
      reason: reason?.trim() || undefined,
      notes: notes?.trim() || undefined,
      appliedAt: new Date().toISOString(),
    })

    return { ok: true }
  }

  const clearMasterOverrideRecord = () => {
    setMasterOverrideRecord(null)
  }

  const getExpenseSettlementStatus: AppState['getExpenseSettlementStatus'] = (payPeriodId, expenseId) =>
    periodExpenseOverrides[payPeriodId]?.[expenseId] ?? null

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
    masterOverrideRecord,
    periodExpenseOverrides,
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
      masterOverrideRecord,
      periodExpenseOverrides,
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
      applyMasterOverride,
      clearMasterOverrideRecord,
      getExpenseSettlementStatus,
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
      masterOverrideRecord,
      periodExpenseOverrides,
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
