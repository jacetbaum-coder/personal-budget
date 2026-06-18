import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Card from '../components/Card'
import InfoRow from '../components/InfoRow'
import Section from '../components/Section'
import {
  calculateAvailableSpending,
  calculateProjectedLeftover,
  calculateSafetyBuffer,
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

  const recurringTotals = getRecurringTotals(periodIndex)
  const projectedLeftover = calculateProjectedLeftover(
    selectedPeriod.payAmount,
    selectedPeriod.transfers.rent,
    selectedPeriod.transfers.openbank,
    recurringTotals.fromSavings
  )
  const safetyBuffer = calculateSafetyBuffer()
  const availableSpending = calculateAvailableSpending(projectedLeftover)

  // ── CashApp manual adjustment planning ────────────────────────────────────
  const [cashAppPlan, setCashAppPlan] = useState<{
    override: number | null
    source: string | null
    confirmed: boolean
  }>({ override: null, source: null, confirmed: false })

  useEffect(() => {
    setCashAppPlan({ override: null, source: null, confirmed: false })
  }, [selectedPayPeriodId])

  const cashAppComputed = recurringTotals.fromCashApp
  const cashAppAmount = cashAppPlan.override ?? cashAppComputed
  const cashAppDelta = cashAppAmount - cashAppComputed

  // ── Period-edit helpers ────────────────────────────────────────────────────
  const updateDraft = (id: number, patch: Partial<PayPeriod>) =>
    setDraftPeriods((curr) => curr.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const updateDraftTransfer = (id: number, key: 'rent' | 'openbank', value: number) =>
    setDraftPeriods((curr) =>
      curr.map((p) => (p.id === id ? { ...p, transfers: { ...p.transfers, [key]: value } } : p))
    )

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

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id

  // ── Shared funding context (used by both edit and add pickers) ────────────
  const fundingCtx = {
    savingsBuffer: SAVINGS_BUFFER,
    checkingBuffer: CHECKING_BUFFER,
    spendingMoney: availableSpending,
    openbankTransfer: selectedPeriod.transfers.openbank,
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

  // ── CashApp adjustment: per-source consequence ────────────────────────────
  const getCashAppSourceConsequence = (sourceId: string, delta: number): { text: string; warning: boolean; requiresConfirm: boolean } => {
    switch (sourceId) {
      case 'savings': {
        const remaining = SAVINGS_BUFFER - delta
        const warn = remaining < 0
        return {
          text: warn
            ? `Exceeds your BofA Savings safety buffer ($${SAVINGS_BUFFER}). Buffer would go −$${Math.abs(remaining)}.`
            : `BofA Savings buffer: $${SAVINGS_BUFFER} → $${remaining}. Still within safety cushion.`,
          warning: warn, requiresConfirm: warn,
        }
      }
      case 'checking': {
        const remaining = CHECKING_BUFFER - delta
        const warn = remaining < 0
        return {
          text: warn
            ? `Exceeds your BofA Checkings safety buffer ($${CHECKING_BUFFER}). Buffer would go −$${Math.abs(remaining)}.`
            : `BofA Checkings buffer: $${CHECKING_BUFFER} → $${remaining}. Still within safety cushion.`,
          warning: warn, requiresConfirm: warn,
        }
      }
      case 'spending': {
        const remaining = availableSpending - delta
        const warn = remaining < 0
        return {
          text: warn
            ? `Spending money would go negative (−$${Math.abs(remaining)}). You'd be spending more than available.`
            : `Available spending: $${availableSpending} → $${remaining} this period.`,
          warning: warn, requiresConfirm: warn,
        }
      }
      case 'openbank': {
        const remaining = selectedPeriod.transfers.openbank - delta
        const warn = remaining < 0
        return {
          text: warn
            ? `OpenBank transfer would go negative. You'd need to pull $${Math.abs(remaining)} directly from your OpenBank account.`
            : `OpenBank transfer this period: $${selectedPeriod.transfers.openbank} → $${remaining}.`,
          warning: warn, requiresConfirm: warn,
        }
      }
      case 'rent': {
        const isFirstPeriod = (periodIndex + 1) % 2 === 0
        const threshold = isFirstPeriod ? 600 : 1200
        const newTransfer = selectedPeriod.transfers.rent - delta
        const cumulative = isFirstPeriod ? newTransfer : 600 + newTransfer
        const warn = cumulative < threshold
        const shortfall = threshold - cumulative
        return {
          text: warn
            ? `Rent fund would have $${cumulative} this ${isFirstPeriod ? 'period' : 'month'} — $${shortfall} short of the $${threshold} target. You'll need to separately add $${shortfall} to BofA Rent Holdings to cover rent.`
            : `Rent transfer: $${selectedPeriod.transfers.rent} → $${newTransfer}. Rent fund still covered ($${cumulative}/$${threshold}).`,
          warning: warn,
          requiresConfirm: true, // always confirm when touching rent
        }
      }
      default:
        return { text: '', warning: false, requiresConfirm: false }
    }
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

const FUNDING_SOURCE_OPTIONS = [
  { id: 'savings',  label: 'BofA Savings' },
  { id: 'checking', label: 'BofA Checkings' },
  { id: 'spending', label: 'Spending Money' },
  { id: 'openbank', label: 'OpenBank' },
  { id: 'rent',     label: 'Rent Money' },
] as const
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
              <input type="number" className={inputCls} value={draftExp.amount}
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
            const lft = calculateProjectedLeftover(period.payAmount, period.transfers.rent, period.transfers.openbank, pt.fromSavings)
            const avail = calculateAvailableSpending(lft)
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
                      <span className="text-slate-600">−${selectedPeriod.transfers.openbank.toLocaleString()}</span>
                    )}
                  </div>
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
                    <span className={`font-semibold ${projectedLeftover < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      ${projectedLeftover.toLocaleString()}
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
                    <span className="text-slate-600">${projectedLeftover.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> Fixed subscriptions</span>
                    <span className="text-slate-600">−${recurringTotals.fromChecking.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> → CashApp load</span>
                    <span className="text-slate-600">−${recurringTotals.fromCashApp.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><span className="text-xs">↳</span> Safety buffer</span>
                    <span className="text-slate-600">−${CHECKING_BUFFER}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="font-medium text-slate-600">Available to spend</span>
                    <span className={`font-bold text-base ${availableSpending < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ${availableSpending.toLocaleString()}
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

                  {/* Editable load amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Loaded from Checkings</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={cashAppAmount}
                        onChange={(e) => setCashAppPlan({ override: Number(e.target.value) === cashAppComputed ? null : Number(e.target.value), source: null, confirmed: false })}
                        className={`w-20 rounded-lg border px-2 py-1 text-right text-sm font-medium focus:outline-none ${cashAppDelta !== 0 ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-700'}`}
                      />
                      {cashAppPlan.override !== null && (
                        <button
                          onClick={() => setCashAppPlan({ override: null, source: null, confirmed: false })}
                          className="rounded-full p-1 text-slate-300 hover:text-red-400 transition-colors"
                          title="Reset to computed"
                        >✕</button>
                      )}
                    </div>
                  </div>

                  {/* Delta adjustment planner */}
                  {cashAppDelta > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2.5">
                      <p className="text-xs font-semibold text-amber-900">
                        You're loading ${cashAppDelta} more than planned. Where does it come from?
                      </p>
                      <div className="space-y-1.5">
                        {FUNDING_SOURCE_OPTIONS.map((src) => {
                          const { text, warning, requiresConfirm } = getCashAppSourceConsequence(src.id, cashAppDelta)
                          const isSelected = cashAppPlan.source === src.id
                          const isConfirmed = isSelected && cashAppPlan.confirmed
                          const needsConfirm = isSelected && requiresConfirm && !isConfirmed
                          return (
                            <div key={src.id}>
                              <button
                                type="button"
                                onClick={() => setCashAppPlan((s) => ({ ...s, source: src.id, confirmed: false }))}
                                className={`w-full rounded-xl border p-2.5 text-left text-xs transition-all ${
                                  isSelected
                                    ? warning
                                      ? 'border-red-300 bg-red-50'
                                      : 'border-emerald-300 bg-emerald-50'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`h-3 w-3 shrink-0 rounded-full border-2 ${isSelected ? (warning ? 'border-red-400 bg-red-400' : 'border-emerald-500 bg-emerald-500') : 'border-slate-300'}`} />
                                  <span className="font-semibold text-slate-900">{src.label}</span>
                                </div>
                                <p className={`mt-1 pl-5 leading-snug ${warning ? 'text-red-700' : 'text-slate-500'}`}>{text}</p>
                              </button>
                              {needsConfirm && (
                                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                                  <p className="flex-1 text-xs text-red-800">Heads up: this puts your {src.label} below the recommended amount.</p>
                                  <button
                                    type="button"
                                    onClick={() => setCashAppPlan((s) => ({ ...s, confirmed: true }))}
                                    className="shrink-0 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                                  >
                                    Confirm anyway
                                  </button>
                                </div>
                              )}
                              {isConfirmed && (
                                <p className="mt-1 pl-2 text-xs font-medium text-emerald-700">✓ Plan set — {src.label} covers the extra ${cashAppDelta}.</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {cashAppDelta < 0 && (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      Surplus ${Math.abs(cashAppDelta)} stays in BofA Checkings.
                    </p>
                  )}

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
                    <input type="number" className={inputCls} value={newExp.amount}
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
                        ${selectedPeriod.transfers.openbank.toLocaleString()} transferred from BofA Savings each period.
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
                            {recurringTotals.fromCashApp > 0 && (
                              <span className="ml-auto text-xs text-slate-400">${recurringTotals.fromCashApp.toLocaleString()} due</span>
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
                            <p className="font-semibold">${availableSpending.toLocaleString()}</p>
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
