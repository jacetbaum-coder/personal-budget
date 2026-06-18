import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Card from '../components/Card'
import Section from '../components/Section'
import {
  SAVINGS_BUFFER,
  CHECKING_BUFFER,
} from '../calculations'
import type { ExpenseCategory, PayPeriod, RecurringExpense } from '../models'
import { accountColorOptions, expenseCategoryLabels } from '../models'
import { isRecurringExpenseDue } from '../recurring'
import { useAppState } from '../state'

const FREQ_OPTIONS: RecurringExpense['frequency'][] = [
  'Every paycheck',
  '1st paycheck of month',
  '2nd paycheck of month',
  'Monthly',
  'Custom',
]
const CAT_OPTIONS = Object.entries(expenseCategoryLabels) as [ExpenseCategory, string][]
const MIN_SPENDING_MONEY = 200
const STARTING_BALANCE_FIELDS: { id: string; label: string; dot: string }[] = [
  { id: 'savings', label: 'BofA Savings', dot: 'bg-blue-400' },
  { id: 'checking', label: 'BofA Checkings', dot: 'bg-sky-400' },
  { id: 'rentFund', label: 'BofA Rent Holdings', dot: 'bg-violet-400' },
  { id: 'cashApp', label: 'CashApp', dot: 'bg-amber-400' },
  { id: 'openbank', label: 'OpenBank', dot: 'bg-emerald-400' },
]

// Maps account color name → full Tailwind class strings (must be literal for Tailwind to include them)
function getColorClasses(color?: string) {
  return accountColorOptions.find((c) => c.value === color) ?? accountColorOptions[accountColorOptions.length - 1]
}

function blankExpense(accounts: { id: string }[]): Omit<RecurringExpense, 'id'> {
  return {
    name: '',
    amount: 0,
    frequency: 'Every paycheck',
    category: 'other',
    sourceAccount: accounts[0]?.id ?? 'savings',
    dueDate: '',
  }
}

export default function PayPeriodsPage() {
  const {
    accounts,
    payPeriods,
    setPayPeriods,
    recurringExpenses,
    setRecurringExpenses,
    selectedPayPeriodId,
    setSelectedPayPeriodId,
    getRecurringTotals,
  } = useAppState()

  // ── Pay-period edit state ──────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [draftPeriods, setDraftPeriods] = useState<PayPeriod[]>(payPeriods)

  // ── Expense edit state ─────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftExp, setDraftExp] = useState<RecurringExpense | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newExp, setNewExp] = useState<Omit<RecurringExpense, 'id'>>(blankExpense(accounts))

  // Funding source plans for expense edits
  const [expFundingPlan, setExpFundingPlan] = useState<{ source: string | null; confirmed: boolean }>({ source: null, confirmed: false })
  const [newExpFundingPlan, setNewExpFundingPlan] = useState<{ source: string | null; confirmed: boolean }>({ source: null, confirmed: false })

  const selectedPeriod = useMemo(
    () => payPeriods.find((period) => period.id === selectedPayPeriodId) ?? payPeriods[0],
    [payPeriods, selectedPayPeriodId]
  )

  const draftSelected = useMemo(
    () => draftPeriods.find((p) => p.id === selectedPayPeriodId) ?? draftPeriods[0],
    [draftPeriods, selectedPayPeriodId]
  )

  const periodIndex = useMemo(
    () => payPeriods.findIndex((period) => period.id === selectedPayPeriodId),
    [payPeriods, selectedPayPeriodId]
  )

  // User-controlled spending amount from the positive remaining pool for each period.
  const [spendingMoneyByPeriod, setSpendingMoneyByPeriod] = useState<Record<number, number>>({})
  const [showStartingBalances, setShowStartingBalances] = useState(false)

  const recurringTotals = getRecurringTotals(periodIndex)
  const cashAppLoad = recurringTotals.groceries + recurringTotals.bus

  const totalRequired =
    selectedPeriod.transfers.rent +
    selectedPeriod.transfers.openbank +
    recurringTotals.fromSavings +
    recurringTotals.fromChecking +
    cashAppLoad +
    SAVINGS_BUFFER +
    CHECKING_BUFFER

  // Positive: money left to allocate. Negative: shortfall.
  const remainingPool = selectedPeriod.payAmount - totalRequired
  const minSpendingForPeriod = remainingPool > 0 ? Math.min(MIN_SPENDING_MONEY, remainingPool) : 0
  const maxSpendingForPeriod = remainingPool > 0 ? remainingPool : 0
  const rawSpendingChoice = spendingMoneyByPeriod[selectedPeriod.id]
  const spendingMoneyTarget =
    remainingPool > 0
      ? Math.max(minSpendingForPeriod, Math.min(maxSpendingForPeriod, rawSpendingChoice ?? minSpendingForPeriod))
      : remainingPool
  const extraToOpenbank = remainingPool > 0 ? remainingPool - spendingMoneyTarget : 0
  const totalOpenbankTransfer = selectedPeriod.transfers.openbank + extraToOpenbank
  const transferToChecking =
    selectedPeriod.payAmount -
    selectedPeriod.transfers.rent -
    totalOpenbankTransfer -
    recurringTotals.fromSavings -
    SAVINGS_BUFFER

  useEffect(() => {
    if (remainingPool <= 0) return

    setSpendingMoneyByPeriod((prev) => {
      if (prev[selectedPeriod.id] != null) return prev

      const selectedIdx = payPeriods.findIndex((period) => period.id === selectedPeriod.id)
      let suggested = minSpendingForPeriod

      for (let i = selectedIdx - 1; i >= 0; i -= 1) {
        const priorId = payPeriods[i]?.id
        if (priorId == null) continue
        const priorChoice = prev[priorId]
        if (typeof priorChoice === 'number') {
          suggested = Math.max(minSpendingForPeriod, Math.min(maxSpendingForPeriod, priorChoice))
          break
        }
      }

      return { ...prev, [selectedPeriod.id]: suggested }
    })
  }, [maxSpendingForPeriod, minSpendingForPeriod, payPeriods, remainingPool, selectedPeriod.id])

  // ── Account snapshot slider (before payday → payday hit → after moves) ───
  const [accountSnapshotStage, setAccountSnapshotStage] = useState<0 | 1 | 2>(2)

  useEffect(() => {
    setAccountSnapshotStage(2)
  }, [selectedPayPeriodId])

  const cycleSnapshots = useMemo(() => {
    const getBaseBalance = (id: string) => accounts.find((a) => a.id === id)?.balance ?? 0
    const accountIds = accounts.map((account) => account.id)

    const snapshots = new Map<number, {
      start: Record<string, number>
      payday: Record<string, number>
      end: Record<string, number>
      remainingPool: number
      spendingMoney: number
      extraToOpenbank: number
    }>()

    let prevEnd: Record<string, number> | null = null
    const fallbackChoices: Record<number, number> = {}

    for (let idx = 0; idx < payPeriods.length; idx += 1) {
      const period = payPeriods[idx]
      if (!period) continue

      const defaultStart: Record<string, number> = {}
      for (const accountId of accountIds) {
        defaultStart[accountId] = prevEnd?.[accountId] ?? getBaseBalance(accountId)
      }

      const overrides = period.startingBalances ?? {}
      const start = { ...defaultStart, ...overrides }

      const totals = getRecurringTotals(idx)
      const periodCashAppLoad = totals.groceries + totals.bus
      const pool =
        period.payAmount -
        (
          period.transfers.rent +
          period.transfers.openbank +
          totals.fromSavings +
          totals.fromChecking +
          periodCashAppLoad +
          SAVINGS_BUFFER +
          CHECKING_BUFFER
        )

      const minSpending = pool > 0 ? Math.min(MIN_SPENDING_MONEY, pool) : 0
      const maxSpending = pool > 0 ? pool : 0

      const explicitChoice = spendingMoneyByPeriod[period.id]
      let historicalChoice: number | undefined
      for (let priorIdx = idx - 1; priorIdx >= 0; priorIdx -= 1) {
        const priorId = payPeriods[priorIdx]?.id
        if (priorId == null) continue
        const priorFromUser = spendingMoneyByPeriod[priorId]
        const priorFromFallback = fallbackChoices[priorId]
        const candidate = priorFromUser ?? priorFromFallback
        if (typeof candidate === 'number') {
          historicalChoice = candidate
          break
        }
      }

      const spendingMoney =
        pool > 0
          ? Math.max(minSpending, Math.min(maxSpending, explicitChoice ?? historicalChoice ?? minSpending))
          : pool
      fallbackChoices[period.id] = spendingMoney

      const extraOpenbankForPeriod = pool > 0 ? pool - spendingMoney : 0
      const totalOpenbankForPeriod = period.transfers.openbank + extraOpenbankForPeriod

      const payday = {
        ...start,
        savings: (start.savings ?? 0) + period.payAmount,
      }

      const end = {
        ...start,
        savings: (start.savings ?? 0) + SAVINGS_BUFFER,
        checking: (start.checking ?? 0) + CHECKING_BUFFER + (pool > 0 ? spendingMoney : 0),
        rentFund: (start.rentFund ?? 0) + period.transfers.rent,
        cashApp: (start.cashApp ?? 0) + periodCashAppLoad - totals.groceries - totals.bus,
        openbank: (start.openbank ?? 0) + totalOpenbankForPeriod,
        spending: pool > 0 ? spendingMoney : 0,
      }

      prevEnd = end

      snapshots.set(period.id, {
        start,
        payday,
        end,
        remainingPool: pool,
        spendingMoney,
        extraToOpenbank: extraOpenbankForPeriod,
      })
    }

    return snapshots
  }, [accounts, getRecurringTotals, payPeriods, spendingMoneyByPeriod])

  const selectedSnapshot = cycleSnapshots.get(selectedPeriod.id)
  const accountSnapshots = selectedSnapshot
    ? [selectedSnapshot.start, selectedSnapshot.payday, selectedSnapshot.end] as const
    : [
        { savings: 0, checking: 0, rentFund: 0, cashApp: 0, openbank: 0, spending: 0 },
        { savings: 0, checking: 0, rentFund: 0, cashApp: 0, openbank: 0, spending: 0 },
        { savings: 0, checking: 0, rentFund: 0, cashApp: 0, openbank: 0, spending: 0 },
      ] as const

  const snapshotStageLabels = ['Before payday', 'Paycheck landed', 'After moves'] as const
  const currentSnapshot = accountSnapshots[accountSnapshotStage]

  const shortfall = Math.max(0, -remainingPool)
  const openbankHelp = Math.min(shortfall, selectedPeriod.transfers.openbank)
  const shortfallAfterOpenbank = shortfall - openbankHelp
  const savingsBufferHelp = Math.min(shortfall, SAVINGS_BUFFER)
  const shortfallAfterSavingsBuffer = shortfall - savingsBufferHelp
  const checkingBufferHelp = Math.min(shortfall, CHECKING_BUFFER)
  const shortfallAfterCheckingBuffer = shortfall - checkingBufferHelp
  const comboOpenbankThenSavings = Math.min(shortfallAfterOpenbank, SAVINGS_BUFFER)
  const comboStillShort = shortfall - openbankHelp - comboOpenbankThenSavings

  // ── Period-edit helpers ────────────────────────────────────────────────────
  const updateDraft = (id: number, patch: Partial<PayPeriod>) =>
    setDraftPeriods((curr) => curr.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const updateDraftTransfer = (id: number, key: 'rent' | 'openbank', value: number) =>
    setDraftPeriods((curr) =>
      curr.map((p) => (p.id === id ? { ...p, transfers: { ...p.transfers, [key]: value } } : p))
    )

  const updateDraftStartingBalance = (periodId: number, accountId: string, rawValue: string) => {
    setDraftPeriods((curr) =>
      curr.map((p) => {
        if (p.id !== periodId) return p
        const current = p.startingBalances ?? {}
        if (rawValue.trim() === '') {
          const { [accountId]: _deleted, ...rest } = current
          return { ...p, startingBalances: Object.keys(rest).length > 0 ? rest : undefined }
        }

        return {
          ...p,
          startingBalances: {
            ...current,
            [accountId]: Number(rawValue),
          },
        }
      })
    )
  }

  const startEdit = () => { setDraftPeriods(payPeriods); setEditMode(true) }
  const cancelEdit = () => { setDraftPeriods(payPeriods); setEditMode(false) }
  const saveChanges = () => { setPayPeriods(draftPeriods); setEditMode(false) }

  // ── Expense-edit helpers ───────────────────────────────────────────────────
  const startEditExp = (exp: RecurringExpense) => {
    setShowAdd(false)
    setEditingId(exp.id)
    setDraftExp({ ...exp })
    setExpFundingPlan({ source: null, confirmed: false })
  }
  const cancelEditExp = () => { setEditingId(null); setDraftExp(null); setExpFundingPlan({ source: null, confirmed: false }) }
  const saveEditExp = () => {
    if (!draftExp) return
    setRecurringExpenses((curr: RecurringExpense[]) =>
      curr.map((e) => (e.id === draftExp.id ? draftExp : e))
    )
    cancelEditExp()
  }
  const deleteExp = (id: number) =>
    setRecurringExpenses((curr: RecurringExpense[]) => curr.filter((e) => e.id !== id))

  const commitAdd = () => {
    if (!newExp.name.trim()) return
    setRecurringExpenses((curr: RecurringExpense[]) => [...curr, { id: Date.now(), ...newExp }])
    setNewExp(blankExpense(accounts))
    setNewExpFundingPlan({ source: null, confirmed: false })
    setShowAdd(false)
  }

  // ── Shared funding context (used by both edit and add pickers) ────────────
  const fundingCtx = {
    savingsBuffer: SAVINGS_BUFFER,
    checkingBuffer: CHECKING_BUFFER,
    spendingMoney: spendingMoneyTarget,
    openbankTransfer: totalOpenbankTransfer,
    rentTransfer: selectedPeriod.transfers.rent,
    periodIndex,
  }

  // Renders the funding source picker panel for a given delta + plan state
  const renderFundingPicker = (
    delta: number,
    expSourceAccount: string,
    plan: { source: string | null; confirmed: boolean },
    setPlan: (p: { source: string | null; confirmed: boolean }) => void
  ) => {
    if (delta <= 0) return null
    const options = getExpFundingSources(expSourceAccount, delta, fundingCtx)
    return (
      <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          +${delta} added — where should this come from?
          <span className="ml-1 font-normal text-blue-600">Pick a source below.</span>
        </p>
        <div className="space-y-1.5">
          {options.map((opt) => {
            const isSelected = plan.source === opt.id
            const needsConfirm = isSelected && opt.requiresConfirm && !plan.confirmed
            const isConfirmed = isSelected && (!opt.requiresConfirm || plan.confirmed)
            return (
              <div key={opt.id}>
                <button
                  type="button"
                  onClick={() => setPlan({ source: opt.id, confirmed: false })}
                  className={`w-full rounded-xl border p-2.5 text-left text-xs transition-all ${
                    isSelected
                      ? opt.warning ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                      isSelected
                        ? opt.warning ? 'border-red-400 bg-red-400' : 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-300'
                    }`} />
                    <span className="font-semibold text-slate-900">{opt.label}</span>
                    <span className="text-slate-400">${opt.current} available</span>
                    {opt.recommended && !isSelected && (
                      <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">suggested</span>
                    )}
                  </div>
                  <p className={`mt-1 pl-5 leading-snug ${opt.warning ? 'text-red-700' : 'text-slate-500'}`}>{opt.detail}</p>
                </button>
                {needsConfirm && (
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <p className="flex-1 text-xs text-red-800">
                      {opt.id === 'rent'
                        ? "This reduces rent coverage. Confirm you'll make up the shortfall separately."
                        : `This takes ${opt.label} below zero. Confirm you're okay with this.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPlan({ source: opt.id, confirmed: true })}
                      className="shrink-0 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Confirm
                    </button>
                  </div>
                )}
                {isConfirmed && (
                  <p className="mt-1 pl-2 text-xs font-medium text-emerald-700">
                    ✓ Funding from {opt.label} — ${opt.current} → ${opt.after} after this expense.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Sorted expenses: due-first then alphabetical ───────────────────────────
  const sortedExpenses = useMemo(
    () =>
      [...recurringExpenses].sort((a, b) => {
        const aDue = isRecurringExpenseDue(a, periodIndex) ? 0 : 1
        const bDue = isRecurringExpenseDue(b, periodIndex) ? 0 : 1
        return aDue !== bDue ? aDue - bDue : a.name.localeCompare(b.name)
      }),
    [recurringExpenses, periodIndex]
  )

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none'
  const selCls = inputCls

  // ── Account group order: savings → rent → checking (↳ cashApp ↳ spending) → openbank
  const GROUP_ORDER = ['savings', 'rentFund', 'checking', 'openbank'] as const

// ── Expense funding source helpers ─────────────────────────────────────────
interface ExpFundingOption {
  id: string
  label: string
  current: number
  after: number
  recommended: boolean
  warning: boolean
  requiresConfirm: boolean
  detail: string
}

function getExpFundingSources(
  expSourceAccount: string,
  delta: number,
  ctx: {
    savingsBuffer: number
    checkingBuffer: number
    spendingMoney: number
    openbankTransfer: number
    rentTransfer: number
    periodIndex: number
  }
): ExpFundingOption[] {
  const { savingsBuffer, checkingBuffer, spendingMoney, openbankTransfer, rentTransfer, periodIndex } = ctx

  const savingsAfter = savingsBuffer - delta
  const checkingAfter = checkingBuffer - delta
  const spendingAfter = spendingMoney - delta
  const openbankAfter = openbankTransfer - delta

  const isFirstPeriod = (periodIndex + 1) % 2 === 0
  const rentThreshold = isFirstPeriod ? 600 : 1200
  const newRentTransfer = rentTransfer - delta
  const rentCumulative = isFirstPeriod ? newRentTransfer : 600 + newRentTransfer
  const rentWarn = rentCumulative < rentThreshold
  const rentShortfall = Math.max(0, rentThreshold - rentCumulative)

  const rawOptions: Omit<ExpFundingOption, 'recommended'>[] = [
    {
      id: 'savings-buffer',
      label: 'BofA Savings buffer',
      current: savingsBuffer,
      after: savingsAfter,
      warning: savingsAfter < 0,
      requiresConfirm: savingsAfter < 0,
      detail: savingsAfter >= 0
        ? `Buffer: $${savingsBuffer} → $${savingsAfter} remaining`
        : `Buffer would go $${Math.abs(savingsAfter)} negative`,
    },
    {
      id: 'spending',
      label: 'Spending money',
      current: spendingMoney,
      after: spendingAfter,
      warning: spendingAfter < 0,
      requiresConfirm: spendingAfter < 0,
      detail: spendingAfter >= 0
        ? `Available: $${spendingMoney} → $${spendingAfter} this period`
        : `Would overspend by $${Math.abs(spendingAfter)}`,
    },
    {
      id: 'checking-buffer',
      label: 'BofA Checkings buffer',
      current: checkingBuffer,
      after: checkingAfter,
      warning: checkingAfter < 0,
      requiresConfirm: checkingAfter < 0,
      detail: checkingAfter >= 0
        ? `Buffer: $${checkingBuffer} → $${checkingAfter} remaining`
        : `Buffer would go $${Math.abs(checkingAfter)} negative`,
    },
    {
      id: 'openbank',
      label: 'OpenBank savings',
      current: openbankTransfer,
      after: openbankAfter,
      warning: openbankAfter < 0,
      requiresConfirm: true, // always confirm touching openbank
      detail: openbankAfter >= 0
        ? `OpenBank transfer: $${openbankTransfer} → $${openbankAfter} this period`
        : `Would need $${Math.abs(openbankAfter)} directly from OpenBank`,
    },
    {
      id: 'rent',
      label: 'Rent money',
      current: rentTransfer,
      after: newRentTransfer,
      warning: rentWarn,
      requiresConfirm: true,
      detail: rentWarn
        ? `Rent fund: $${rentCumulative}/$${rentThreshold} — you'd need to add $${rentShortfall} to BofA Rent Holdings separately`
        : `Rent transfer: $${rentTransfer} → $${newRentTransfer} (rent still covered)`,
    },
  ]

  // Smart ordering by expense source account
  let order: string[]
  if (expSourceAccount === 'savings') {
    order = ['savings-buffer', 'spending', 'checking-buffer', 'openbank', 'rent']
  } else if (expSourceAccount === 'checking' || expSourceAccount === 'cashApp') {
    order = ['spending', 'checking-buffer', 'savings-buffer', 'openbank', 'rent']
  } else {
    order = ['spending', 'savings-buffer', 'checking-buffer', 'openbank', 'rent']
  }

  const sorted = order.map((id) => rawOptions.find((o) => o.id === id)!).filter(Boolean)

  // First non-warning option is recommended
  const firstSafeIdx = sorted.findIndex((o) => !o.warning)
  return sorted.map((o, i) => ({ ...o, recommended: i === firstSafeIdx }))
}

  const byAccount = (id: string) => sortedExpenses.filter((e) => e.sourceAccount === id)

  const renderExpRow = (expense: RecurringExpense) => {
    const due = isRecurringExpenseDue(expense, periodIndex)
    if (editingId === expense.id && draftExp) {
      const origAmount = recurringExpenses.find((e) => e.id === expense.id)?.amount ?? 0
      const editDelta = draftExp.amount - origAmount
      return (
        <div key={expense.id} className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Name</label>
              <input className={inputCls} value={draftExp.name}
                onChange={(e) => setDraftExp((p) => p ? { ...p, name: e.target.value } : p)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Amount ($)</label>
              <input type="number" className={inputCls} value={draftExp.amount === 0 ? '' : draftExp.amount}
                onChange={(e) => {
                  setDraftExp((p) => p ? { ...p, amount: Number(e.target.value) } : p)
                  setExpFundingPlan({ source: null, confirmed: false })
                }} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Frequency</label>
              <select className={selCls} value={draftExp.frequency}
                onChange={(e) => setDraftExp((p) => p ? { ...p, frequency: e.target.value as RecurringExpense['frequency'] } : p)}>
                {FREQ_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {/* Funding picker — appears when amount increased */}
            {renderFundingPicker(editDelta, draftExp.sourceAccount, expFundingPlan, setExpFundingPlan)}
            <div>
              <label className="mb-1 block text-xs text-slate-500">Account</label>
              <select className={selCls} value={draftExp.sourceAccount}
                onChange={(e) => setDraftExp((p) => p ? { ...p, sourceAccount: e.target.value } : p)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Category</label>
              <select className={selCls} value={draftExp.category}
                onChange={(e) => setDraftExp((p) => p ? { ...p, category: e.target.value as ExpenseCategory } : p)}>
                {CAT_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Bill due date (optional)</label>
              <input className={inputCls} placeholder="e.g. the 15th" value={draftExp.dueDate ?? ''}
                onChange={(e) => setDraftExp((p) => p ? { ...p, dueDate: e.target.value } : p)} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs text-slate-500">Status</label>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => setDraftExp((p) => p ? { ...p, active: true } : p)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-colors ${
                    draftExp.active !== false ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}>
                  Active
                </button>
                <button type="button"
                  onClick={() => setDraftExp((p) => p ? { ...p, active: false } : p)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-colors ${
                    draftExp.active === false ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}>
                  Not active
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={saveEditExp}
              className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800">Save</button>
            <button onClick={cancelEditExp}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={() => deleteExp(expense.id)}
              className="ml-auto rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">Delete</button>
          </div>
        </div>
      )
    }
    return (
      <div
        key={expense.id}
        className={`flex items-center gap-3 rounded-xl border-l-4 pl-3 pr-4 py-2.5 text-sm ${getColorClasses(accounts.find((a) => a.id === expense.sourceAccount)?.color).border} ${expense.active === false ? 'bg-white opacity-40' : due ? 'bg-slate-50' : 'bg-white opacity-50'}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-slate-900">{expense.name}</p>
            {expense.active === false
              ? <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">paused</span>
              : due && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">due</span>}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {expense.frequency}{expense.dueDate ? <span className="ml-1 text-slate-300"> · due {expense.dueDate}</span> : null}
          </p>
        </div>
        <p className={`shrink-0 font-semibold ${expense.active === false ? 'text-slate-400' : 'text-slate-900'}`}>${expense.amount.toLocaleString()}</p>
        <button onClick={() => startEditExp(expense)}
          className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">Edit</button>
      </div>
    )
  }

  // ── Drag-to-resize state ────────────────────────────────────────────────────
  const [leftPct, setLeftPct] = useState(42)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = Math.min(70, Math.max(25, ((ev.clientX - rect.left) / rect.width) * 100))
      setLeftPct(Math.round(pct))
    }
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return (
    <div className="space-y-6">
      <Section title="Pay Periods" description="What does my money look like across all upcoming periods?">
        {/* Period selector grid */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {payPeriods.map((period) => {
            const idx = payPeriods.indexOf(period)
            const pt = getRecurringTotals(idx)
            const periodCashAppLoad = pt.groceries + pt.bus
            const req =
              period.transfers.rent +
              period.transfers.openbank +
              pt.fromSavings +
              pt.fromChecking +
              periodCashAppLoad +
              SAVINGS_BUFFER +
              CHECKING_BUFFER
            const avail = period.payAmount - req
            const active = period.id === selectedPayPeriodId
            return (
              <button
                key={period.id}
                type="button"
                onClick={() => setSelectedPayPeriodId(period.id)}
                className={`rounded-2xl border p-4 text-left shadow-sm transition focus:outline-none ${
                  active
                    ? 'border-slate-900 bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                    : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{period.label}</p>
                <p className="mt-2 text-xl font-semibold">${period.payAmount.toLocaleString()}</p>
                <p className="mt-2 text-xs text-slate-400">${avail.toLocaleString()} avail.</p>
              </button>
            )
          })}
        </div>

        {/* Resizable Detail + Expenses panels */}
        <div ref={containerRef} className="flex gap-0 items-stretch">

          {/* Period detail (left) */}
          <div style={{ width: `${leftPct}%`, minWidth: 0 }}>
          <Card
            title={`Period detail — ${selectedPeriod.label}`}
            subtitle={`Pay date: ${selectedPeriod.payDate}`}
            action={
              editMode ? (
                <div className="flex gap-2">
                  <button onClick={cancelEdit} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button onClick={saveChanges} className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800">Save</button>
                </div>
              ) : (
                <button onClick={startEdit} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Edit</button>
              )
            }
          >
            <div className="space-y-5 text-sm">

              {/* Hidden advanced controls for carry-forward starting balances */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <button
                  type="button"
                  onClick={() => setShowStartingBalances((prev) => !prev)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Advanced starting balances</span>
                  <span className="text-xs text-slate-500">{showStartingBalances ? 'Hide' : 'Show'}</span>
                </button>
                {showStartingBalances && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-slate-500">
                      Auto-filled from the previous period ending balances. Add an override only when you need to correct the carry-forward.
                    </p>
                    {STARTING_BALANCE_FIELDS.map((field) => {
                      const autoValue = Number(selectedSnapshot?.start[field.id] ?? 0)
                      const overrideValue = draftSelected.startingBalances?.[field.id]
                      return (
                        <div key={field.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <span className={`h-2 w-2 rounded-full ${field.dot}`} />
                            {field.label}
                          </p>
                          <p className="text-xs text-slate-400">Auto ${autoValue.toLocaleString()}</p>
                          {editMode ? (
                            <input
                              type="number"
                              className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs"
                              placeholder={String(autoValue)}
                              value={overrideValue ?? ''}
                              onChange={(e) => updateDraftStartingBalance(draftSelected.id, field.id, e.target.value)}
                            />
                          ) : (
                            <p className="text-xs font-medium text-slate-600">
                              {overrideValue != null ? `Override $${overrideValue.toLocaleString()}` : 'Using auto'}
                            </p>
                          )}
                        </div>
                      )
                    })}
                    {!editMode && (
                      <p className="text-[11px] text-slate-400">Use Edit to change overrides.</p>
                    )}
                  </div>
                )}
              </div>

              {/* BofA Savings section */}
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
                  <span className="h-2 w-2 rounded-full bg-blue-400" /> BofA Savings
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Paycheck in</span>
                    {editMode ? (
                      <input type="number" className={`${inputCls} w-28 text-right`} value={draftSelected.payAmount}
                        onChange={(e) => updateDraft(draftSelected.id, { payAmount: Number(e.target.value) })} />
                    ) : (
                      <span className="font-semibold text-slate-900">${selectedPeriod.payAmount.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> → Rent Holdings</span>
                    {editMode ? (
                      <input type="number" className={`${inputCls} w-28 text-right`} value={draftSelected.transfers.rent}
                        onChange={(e) => updateDraftTransfer(draftSelected.id, 'rent', Number(e.target.value))} />
                    ) : (
                      <span className="text-slate-600">−${selectedPeriod.transfers.rent.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> → OpenBank</span>
                    {editMode ? (
                      <input type="number" className={`${inputCls} w-28 text-right`} value={draftSelected.transfers.openbank}
                        onChange={(e) => updateDraftTransfer(draftSelected.id, 'openbank', Number(e.target.value))} />
                    ) : (
                      <span className="text-slate-600">−${totalOpenbankTransfer.toLocaleString()}</span>
                    )}
                  </div>
                  {!editMode && extraToOpenbank > 0 && (
                    <p className="pl-4 text-[11px] text-emerald-600">
                      Includes +${extraToOpenbank.toLocaleString()} extra from this period's remaining pool.
                    </p>
                  )}
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> Savings bills</span>
                    <span className="text-slate-600">−${recurringTotals.fromSavings.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> Safety buffer</span>
                    <span className="text-slate-600">−${SAVINGS_BUFFER}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="font-medium text-slate-600">→ Transfer to Checkings</span>
                    <span className={`font-semibold ${transferToChecking < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      ${transferToChecking.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* BofA Checkings section */}
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600">
                  <span className="h-2 w-2 rounded-full bg-sky-400" /> BofA Checkings
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Received from Savings</span>
                    <span className="text-slate-600">${transferToChecking.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> Fixed subscriptions</span>
                    <span className="text-slate-600">−${recurringTotals.fromChecking.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> → CashApp load</span>
                    <span className="text-slate-600">−${cashAppLoad.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> Safety buffer</span>
                    <span className="text-slate-600">−${CHECKING_BUFFER}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="font-medium text-slate-600">Available to spend</span>
                    <span className={`font-bold text-base ${spendingMoneyTarget < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ${spendingMoneyTarget.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* CashApp section */}
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> CashApp
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Loaded from Checkings</span>
                    <span className="text-slate-600 font-medium">${cashAppLoad.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-400">Automatically calculated as groceries + bus from recurring expenses.</p>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> Groceries</span>
                    <span className="text-slate-600">−${recurringTotals.groceries.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> Bus</span>
                    <span className="text-slate-600">−${recurringTotals.bus.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Account targets snapshot bubble */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Account targets</p>
                    <p className="mt-1 text-xs text-slate-500">Slide to preview balances before payday, right when paycheck lands, and after you move everything.</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                    {snapshotStageLabels[accountSnapshotStage]}
                  </span>
                </div>

                <div className="mb-3">
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={1}
                    value={accountSnapshotStage}
                    onChange={(e) => setAccountSnapshotStage(Number(e.target.value) as 0 | 1 | 2)}
                    className="w-full accent-slate-900"
                  />
                  <div className="mt-1 grid grid-cols-3 text-[11px] text-slate-400">
                    {snapshotStageLabels.map((label, idx) => (
                      <span key={label} className={`${idx === 0 ? 'text-left' : idx === 1 ? 'text-center' : 'text-right'} ${accountSnapshotStage === idx ? 'font-semibold text-slate-700' : ''}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {[
                    { id: 'savings', label: 'BofA Savings', value: currentSnapshot.savings, dot: 'bg-blue-400' },
                    { id: 'checking', label: 'BofA Checkings', value: currentSnapshot.checking, dot: 'bg-sky-400' },
                    { id: 'rentFund', label: 'BofA Rent Holdings', value: currentSnapshot.rentFund, dot: 'bg-violet-400' },
                    { id: 'cashApp', label: 'CashApp', value: currentSnapshot.cashApp, dot: 'bg-amber-400' },
                    { id: 'spending', label: 'Spending Money', value: currentSnapshot.spending, dot: 'bg-slate-400' },
                    { id: 'openbank', label: 'OpenBank', value: currentSnapshot.openbank, dot: 'bg-emerald-400' },
                  ].map((row) => {
                    const beforeValue = accountSnapshots[0][row.id as keyof typeof accountSnapshots[0]]
                    const delta = row.value - Number(beforeValue)
                    return (
                      <div key={row.id} className="flex items-center justify-between rounded-xl bg-white border border-slate-100 px-3 py-2">
                        <p className="flex items-center gap-2 text-slate-600">
                          <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                          <span className="text-xs font-medium">{row.label}</span>
                        </p>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">${row.value.toLocaleString()}</p>
                          <p className={`text-[11px] ${delta === 0 ? 'text-slate-400' : delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {delta === 0 ? 'No change' : `${delta > 0 ? '+' : '−'}$${Math.abs(delta).toLocaleString()} vs before`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </Card>
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            className="flex w-3 shrink-0 cursor-col-resize items-center justify-center"
            title="Drag to resize"
          >
            <div className="h-10 w-0.5 rounded-full bg-slate-200 hover:bg-slate-400 transition-colors" />
          </div>

          {/* Recurring expenses manager (right) */}
          <div style={{ flex: 1, minWidth: 0 }}>
          <Card
            title="Recurring expenses"
            subtitle="All bills and transfers. Click Edit on any row to change it."
            action={
              !showAdd ? (
                <button
                  onClick={() => { setShowAdd(true); setEditingId(null); setNewExp(blankExpense(accounts)) }}
                  className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  + Add
                </button>
              ) : undefined
            }
          >
            {/* Affordability + allocation planner */}
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Affordability & allocation</p>
                  <p className="text-xs text-slate-500">Use one slider to move remaining pool between OpenBank and spending money. Spending keeps a minimum floor of $200 when possible.</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${remainingPool >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {remainingPool >= 0 ? 'Affordable' : 'Short by'} {remainingPool >= 0 ? `$${remainingPool.toLocaleString()}` : `$${Math.abs(remainingPool).toLocaleString()}`}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between"><span>Paycheck</span><span className="font-medium text-slate-900">${selectedPeriod.payAmount.toLocaleString()}</span></div>
                <div className="flex items-center justify-between"><span>Total required this period (bills + transfers + $200 buffers)</span><span className="font-medium text-slate-900">${totalRequired.toLocaleString()}</span></div>
              </div>

              {remainingPool >= 0 ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                    <p>Minimum spending floor: <span className="font-semibold text-slate-900">${minSpendingForPeriod.toLocaleString()}</span></p>
                    <p>Remaining pool: <span className="font-semibold text-slate-900">${remainingPool.toLocaleString()}</span></p>
                  </div>

                  <input
                    type="range"
                    min={minSpendingForPeriod}
                    max={maxSpendingForPeriod}
                    step={1}
                    value={remainingPool > 0 ? spendingMoneyTarget : 0}
                    onChange={(e) => setSpendingMoneyByPeriod((prev) => ({ ...prev, [selectedPeriod.id]: Number(e.target.value) }))}
                    className="w-full accent-slate-900"
                    disabled={remainingPool <= 0}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                    <p>Extra to OpenBank: <span className="font-semibold text-emerald-700">${extraToOpenbank.toLocaleString()}</span></p>
                    <p>Spending money: <span className="font-semibold text-slate-900">${spendingMoneyTarget.toLocaleString()}</span></p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-2">
                  <p className="font-semibold">You cannot afford everything this period as currently planned.</p>
                  <p>Options (preview only):</p>
                  <div className="space-y-1.5">
                    <p>• Pull from OpenBank transfer: reduce by ${openbankHelp.toLocaleString()} → OpenBank transfer becomes ${(selectedPeriod.transfers.openbank - openbankHelp).toLocaleString()} ({shortfallAfterOpenbank > 0 ? `$${shortfallAfterOpenbank.toLocaleString()} still short` : 'fully covered'})</p>
                    <p>• Use BofA Savings buffer: down by ${savingsBufferHelp.toLocaleString()} → savings buffer becomes ${(SAVINGS_BUFFER - savingsBufferHelp).toLocaleString()} ({shortfallAfterSavingsBuffer > 0 ? `$${shortfallAfterSavingsBuffer.toLocaleString()} still short` : 'fully covered'})</p>
                    <p>• Use BofA Checkings buffer: down by ${checkingBufferHelp.toLocaleString()} → checkings buffer becomes ${(CHECKING_BUFFER - checkingBufferHelp).toLocaleString()} ({shortfallAfterCheckingBuffer > 0 ? `$${shortfallAfterCheckingBuffer.toLocaleString()} still short` : 'fully covered'})</p>
                    <p>• Combo suggestion: OpenBank (${openbankHelp.toLocaleString()}) + Savings buffer (${comboOpenbankThenSavings.toLocaleString()}) {comboStillShort > 0 ? `→ still short $${comboStillShort.toLocaleString()}` : '→ covers full shortfall'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Add form */}
            {showAdd && (
              <div className="mb-4 rounded-2xl border border-slate-300 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-900">New expense</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-slate-500">Name</label>
                    <input className={inputCls} placeholder="e.g. Netflix" value={newExp.name}
                      onChange={(e) => setNewExp((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Amount ($)</label>
                    <input type="number" className={inputCls} value={newExp.amount === 0 ? '' : newExp.amount}
                      onChange={(e) => {
                        setNewExp((p) => ({ ...p, amount: Number(e.target.value) }))
                        setNewExpFundingPlan({ source: null, confirmed: false })
                      }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Frequency</label>
                    <select className={selCls} value={newExp.frequency}
                      onChange={(e) => setNewExp((p) => ({ ...p, frequency: e.target.value as RecurringExpense['frequency'] }))}>
                      {FREQ_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  {/* Funding picker for new expense */}
                  {renderFundingPicker(newExp.amount, newExp.sourceAccount, newExpFundingPlan, setNewExpFundingPlan)}
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Account</label>
                    <select className={selCls} value={newExp.sourceAccount}
                      onChange={(e) => {
                        setNewExp((p) => ({ ...p, sourceAccount: e.target.value }))
                        setNewExpFundingPlan({ source: null, confirmed: false })
                      }}>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Category</label>
                    <select className={selCls} value={newExp.category}
                      onChange={(e) => setNewExp((p) => ({ ...p, category: e.target.value as ExpenseCategory }))}>
                      {CAT_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Bill due date (optional)</label>
                    <input className={inputCls} placeholder="e.g. the 15th" value={newExp.dueDate ?? ''}
                      onChange={(e) => setNewExp((p) => ({ ...p, dueDate: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={commitAdd}
                    className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                    Add expense
                  </button>
                  <button onClick={() => { setShowAdd(false); setNewExpFundingPlan({ source: null, confirmed: false }) }}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Grouped expense list */}
            <div className="space-y-5">
              {GROUP_ORDER.map((accountId) => {
                const account = accounts.find((a) => a.id === accountId)
                if (!account) return null
                const colorCls = getColorClasses(account.color)
                const groupExps = byAccount(accountId)
                const cashAppExps = accountId === 'checking' ? byAccount('cashApp') : []
                // total due this period for this group (including sub-groups for checking)
                const dueTotal = [...groupExps, ...(accountId === 'checking' ? cashAppExps : [])]
                  .filter((e) => isRecurringExpenseDue(e, periodIndex))
                  .reduce((s, e) => s + e.amount, 0)

                return (
                  <div key={accountId}>
                    {/* Group header */}
                    <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorCls.dot}`} />
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{account.name}</p>
                      {dueTotal > 0 && <span className="ml-auto text-xs font-medium text-slate-400">${dueTotal.toLocaleString()} due</span>}
                    </div>

                    {/* Group expenses (or transfer info if empty) */}
                    {groupExps.length > 0 ? (
                      <div className="space-y-1.5">{groupExps.map(renderExpRow)}</div>
                    ) : accountId === 'rentFund' ? (
                      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        ${selectedPeriod.transfers.rent.toLocaleString()} transferred from BofA Savings each period.
                      </p>
                    ) : accountId === 'openbank' ? (
                      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        ${totalOpenbankTransfer.toLocaleString()} transferred from BofA Savings this period.
                      </p>
                    ) : null}

                    {/* Sub-groups under Checkings */}
                    {accountId === 'checking' && (
                      <div className="mt-3 ml-3 space-y-4 border-l-2 border-slate-100 pl-4">
                        {/* CashApp */}
                        <div>
                          <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">CashApp</p>
                            {cashAppLoad > 0 && (
                              <span className="ml-auto text-xs text-slate-400">${cashAppLoad.toLocaleString()} due</span>
                            )}
                          </div>
                          <div className="space-y-1.5">{cashAppExps.map(renderExpRow)}</div>
                        </div>
                        {/* Spending Money */}
                        <div>
                          <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Spending Money</p>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">
                            <p>Available this period</p>
                            <p className="font-semibold">${spendingMoneyTarget.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
          </div>
        </div>
      </Section>
    </div>
  )
}
