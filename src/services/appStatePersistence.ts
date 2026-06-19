import type { Account, MasterOverrideRecord, OverrideEntryStage, PayPeriod, PeriodExpenseOverrides, RecurringExpense, TransactionRecord } from '../models'
import { sampleAccounts, samplePayPeriods, sampleRecurringExpenses } from '../models'
import { historicalTransactions, historicalPayPeriods } from '../data/historicalData'

export interface PersistedNotifications {
  email: boolean
  push: boolean
}

export interface PersistedAppStateData {
  schemaVersion: number
  accounts: Account[]
  payPeriods: PayPeriod[]
  recurringExpenses: RecurringExpense[]
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
  notifications: PersistedNotifications
}

export interface RemotePersistedStateResult {
  data: PersistedAppStateData
  updatedAt: string | null
}

const LOCAL_STORAGE_KEY = 'budget-os/app-state'
const REMOTE_SYNC_ENABLED = import.meta.env.VITE_ENABLE_REMOTE_SYNC === 'true'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_ROW_ID = import.meta.env.VITE_SUPABASE_APP_STATE_ROW_ID ?? 'default'
const SCHEMA_VERSION = 4

export function createDefaultPersistedState(): PersistedAppStateData {
  const allPayPeriods = [...historicalPayPeriods, ...samplePayPeriods]
  return {
    schemaVersion: SCHEMA_VERSION,
    accounts: sampleAccounts,
    payPeriods: allPayPeriods,
    recurringExpenses: sampleRecurringExpenses,
    transactions: historicalTransactions,
    masterOverrideRecord: null,
    periodExpenseOverrides: {},
    selectedPayPeriodId: samplePayPeriods[0]?.id ?? 1,
    selectedForecastPointId: 4,
    extraMoney: 520,
    selectedMoverDestination: 'checking',
    dashboardHeading: 'Your future cashflow at a glance',
    dashboardButtonText: 'New allocation',
    defaultPayPeriodLabel: 'Biweekly',
    defaultPaycheckAmount: samplePayPeriods[0]?.payAmount ?? 0,
    currency: 'USD',
    selectedPayDate: '2026-06-28',
    forecastHorizon: 30,
    notifications: {
      email: false,
      push: true,
    },
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseMasterOverrideRecord(value: unknown): MasterOverrideRecord | null {
  if (!isObject(value)) return null
  if (typeof value.payPeriodId !== 'number') return null
  if (typeof value.appliedAt !== 'string') return null
  if (!isObject(value.accountBalances)) return null

  const accountBalancesEntries = Object.entries(value.accountBalances)
  if (accountBalancesEntries.length === 0) return null

  const accountBalances = accountBalancesEntries.reduce<Record<string, number>>((acc, [accountId, rawAmount]) => {
    if (typeof rawAmount === 'number' && Number.isFinite(rawAmount)) {
      acc[accountId] = rawAmount
    }
    return acc
  }, {})

  if (Object.keys(accountBalances).length === 0) return null

  const paidExpenseIds = Array.isArray(value.paidExpenseIds)
    ? value.paidExpenseIds.filter((id): id is number => typeof id === 'number')
    : []
  const unpaidExpenseIds = Array.isArray(value.unpaidExpenseIds)
    ? value.unpaidExpenseIds.filter((id): id is number => typeof id === 'number')
    : []

  const forcedSpendingMoneyTarget =
    typeof value.forcedSpendingMoneyTarget === 'number' && Number.isFinite(value.forcedSpendingMoneyTarget)
      ? value.forcedSpendingMoneyTarget
      : undefined

  const validStages: OverrideEntryStage[] = ['prePaycheck', 'paycheckLanded', 'afterRentOpenbank', 'afterAll']
  const entryStage: OverrideEntryStage =
    typeof value.entryStage === 'string' && validStages.includes(value.entryStage as OverrideEntryStage)
      ? (value.entryStage as OverrideEntryStage)
      : 'prePaycheck'

  return {
    payPeriodId: value.payPeriodId,
    accountBalances,
    paidExpenseIds,
    unpaidExpenseIds,
    forcedSpendingMoneyTarget,
    entryStage,
    reason: typeof value.reason === 'string' ? value.reason : undefined,
    notes: typeof value.notes === 'string' ? value.notes : undefined,
    appliedAt: value.appliedAt,
  }
}

function parsePeriodExpenseOverrides(value: unknown): PeriodExpenseOverrides {
  if (!isObject(value)) return {}

  const output: PeriodExpenseOverrides = {}

  for (const [periodIdRaw, expenseMapRaw] of Object.entries(value)) {
    const periodId = Number(periodIdRaw)
    if (!Number.isFinite(periodId) || !isObject(expenseMapRaw)) continue

    const parsedExpenseMap: Record<number, 'paidAlready' | 'unpaid'> = {}

    for (const [expenseIdRaw, statusRaw] of Object.entries(expenseMapRaw)) {
      const expenseId = Number(expenseIdRaw)
      if (!Number.isFinite(expenseId)) continue
      if (statusRaw !== 'paidAlready' && statusRaw !== 'unpaid') continue
      parsedExpenseMap[expenseId] = statusRaw
    }

    if (Object.keys(parsedExpenseMap).length > 0) {
      output[periodId] = parsedExpenseMap
    }
  }

  return output
}

export function mergePersistedState(input: unknown): PersistedAppStateData {
  const defaults = createDefaultPersistedState()
  const raw = isObject(input) ? input : {}

  return {
    schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : defaults.schemaVersion,
    accounts: Array.isArray(raw.accounts) ? (raw.accounts as Account[]) : defaults.accounts,
    payPeriods: Array.isArray(raw.payPeriods) ? (raw.payPeriods as PayPeriod[]) : defaults.payPeriods,
    recurringExpenses: Array.isArray(raw.recurringExpenses) ? (raw.recurringExpenses as RecurringExpense[]) : defaults.recurringExpenses,
    transactions: Array.isArray(raw.transactions) ? (raw.transactions as TransactionRecord[]) : defaults.transactions,
    masterOverrideRecord: parseMasterOverrideRecord(raw.masterOverrideRecord),
    periodExpenseOverrides: parsePeriodExpenseOverrides(raw.periodExpenseOverrides),
    selectedPayPeriodId: typeof raw.selectedPayPeriodId === 'number' ? raw.selectedPayPeriodId : defaults.selectedPayPeriodId,
    selectedForecastPointId: typeof raw.selectedForecastPointId === 'number' ? raw.selectedForecastPointId : defaults.selectedForecastPointId,
    extraMoney: typeof raw.extraMoney === 'number' ? raw.extraMoney : defaults.extraMoney,
    selectedMoverDestination:
      typeof raw.selectedMoverDestination === 'string' ? (raw.selectedMoverDestination as Account['id']) : defaults.selectedMoverDestination,
    dashboardHeading: typeof raw.dashboardHeading === 'string' ? raw.dashboardHeading : defaults.dashboardHeading,
    dashboardButtonText: typeof raw.dashboardButtonText === 'string' ? raw.dashboardButtonText : defaults.dashboardButtonText,
    defaultPayPeriodLabel: typeof raw.defaultPayPeriodLabel === 'string' ? raw.defaultPayPeriodLabel : defaults.defaultPayPeriodLabel,
    defaultPaycheckAmount: typeof raw.defaultPaycheckAmount === 'number' ? raw.defaultPaycheckAmount : defaults.defaultPaycheckAmount,
    currency: typeof raw.currency === 'string' ? raw.currency : defaults.currency,
    selectedPayDate: typeof raw.selectedPayDate === 'string' ? raw.selectedPayDate : defaults.selectedPayDate,
    forecastHorizon: typeof raw.forecastHorizon === 'number' ? raw.forecastHorizon : defaults.forecastHorizon,
    notifications:
      isObject(raw.notifications) && typeof raw.notifications.email === 'boolean' && typeof raw.notifications.push === 'boolean'
        ? { email: raw.notifications.email, push: raw.notifications.push }
        : defaults.notifications,
  }
}

export function loadLocalPersistedState(): PersistedAppStateData | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return null
    return mergePersistedState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveLocalPersistedState(data: PersistedAppStateData) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
}

export function isRemotePersistenceConfigured() {
  return REMOTE_SYNC_ENABLED || Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

async function loadProxyPersistedState(): Promise<RemotePersistedStateResult | null> {
  const response = await fetch('/api/app-state', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 404 || response.status === 405) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Proxy load failed with ${response.status}`)
  }

  const payload = (await response.json()) as { data?: unknown; updatedAt?: string | null }
  if (!payload.data) return null

  return {
    data: mergePersistedState(payload.data),
    updatedAt: payload.updatedAt ?? null,
  }
}

async function saveProxyPersistedState(data: PersistedAppStateData): Promise<string | null | undefined> {
  const response = await fetch('/api/app-state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  })

  if (response.status === 404 || response.status === 405) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Proxy save failed with ${response.status}`)
  }

  const payload = (await response.json()) as { updatedAt?: string | null }
  return payload.updatedAt ?? null
}

function getRemoteHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY ?? '',
    Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
    'Content-Type': 'application/json',
  }
}

export async function loadRemotePersistedState(): Promise<RemotePersistedStateResult | null> {
  if (!isRemotePersistenceConfigured()) return null

  if (REMOTE_SYNC_ENABLED) {
    const proxyState = await loadProxyPersistedState()
    if (proxyState) return proxyState
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/app_state?id=eq.${encodeURIComponent(SUPABASE_ROW_ID)}&select=data,updated_at`,
    {
      method: 'GET',
      headers: getRemoteHeaders(),
    }
  )

  if (!response.ok) {
    throw new Error(`Remote load failed with ${response.status}`)
  }

  const rows = (await response.json()) as Array<{ data?: unknown; updated_at?: string | null }>
  const row = rows[0]
  if (!row?.data) return null

  return {
    data: mergePersistedState(row.data),
    updatedAt: row.updated_at ?? null,
  }
}

export async function saveRemotePersistedState(data: PersistedAppStateData): Promise<string | null> {
  if (!isRemotePersistenceConfigured()) return null

  if (REMOTE_SYNC_ENABLED) {
    const proxyUpdatedAt = await saveProxyPersistedState(data)
    if (proxyUpdatedAt !== null) {
      return proxyUpdatedAt ?? new Date().toISOString()
    }
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Date().toISOString()
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/app_state?on_conflict=id`, {
    method: 'POST',
    headers: {
      ...getRemoteHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([
      {
        id: SUPABASE_ROW_ID,
        data,
      },
    ]),
  })

  if (!response.ok) {
    throw new Error(`Remote save failed with ${response.status}`)
  }

  const rows = (await response.json()) as Array<{ updated_at?: string | null }>
  return rows[0]?.updated_at ?? new Date().toISOString()
}

export function clearLocalPersistedState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LOCAL_STORAGE_KEY)
}
