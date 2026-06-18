import { useMemo, useState } from 'react'
import Card from '../components/Card'
import InfoRow from '../components/InfoRow'
import Section from '../components/Section'
import {
  calculateAvailableSpending,
  calculateProjectedLeftover,
  calculateSafetyBuffer
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
  const safetyBuffer = calculateSafetyBuffer(projectedLeftover)
  const availableSpending = calculateAvailableSpending(projectedLeftover, safetyBuffer)

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
  }
  const cancelEditExp = () => { setEditingId(null); setDraftExp(null) }
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
    setShowAdd(false)
  }

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id

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

  return (
    <div className="space-y-6">
      <Section title="Pay Periods" description="What does my money look like across all upcoming periods?">
        {/* Period selector grid */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {payPeriods.map((period) => {
            const idx = payPeriods.indexOf(period)
            const pt = getRecurringTotals(idx)
            const lft = calculateProjectedLeftover(period.payAmount, period.transfers.rent, period.transfers.openbank, pt.fromSavings)
            const avail = calculateAvailableSpending(lft, calculateSafetyBuffer(lft))
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

        {/* Detail + Expenses grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">

          {/* Period detail (left) */}
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
            <div className="space-y-3">
              {editMode ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Pay Amount</label>
                    <input type="number" className={inputCls} value={draftSelected.payAmount}
                      onChange={(e) => updateDraft(draftSelected.id, { payAmount: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Rent Transfer</label>
                    <input type="number" className={inputCls} value={draftSelected.transfers.rent}
                      onChange={(e) => updateDraftTransfer(draftSelected.id, 'rent', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">OpenBank Transfer</label>
                    <input type="number" className={inputCls} value={draftSelected.transfers.openbank}
                      onChange={(e) => updateDraftTransfer(draftSelected.id, 'openbank', Number(e.target.value))} />
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label="Pay amount" value={`$${selectedPeriod.payAmount.toLocaleString()}`} />
                  <InfoRow label="Rent transfer" value={`$${selectedPeriod.transfers.rent.toLocaleString()}`} />
                  <InfoRow label="OpenBank transfer" value={`$${selectedPeriod.transfers.openbank.toLocaleString()}`} />
                </>
              )}
              <div className="border-t border-slate-100" />
              <InfoRow label="Savings expenses due" value={`$${recurringTotals.fromSavings.toLocaleString()}`} />
              <InfoRow label="Checkings expenses" value={`$${recurringTotals.fromChecking.toLocaleString()}`} />
              <InfoRow label="CashApp load" value={`$${recurringTotals.fromCashApp.toLocaleString()}`} />
              <InfoRow label="Projected leftover" value={`$${projectedLeftover.toLocaleString()}`} />
              <InfoRow label="Safety buffer" value={`$${safetyBuffer.toLocaleString()}`} note={`${Math.round((safetyBuffer / Math.max(projectedLeftover, 1)) * 100)}%`} />
              <InfoRow label="Available spending" value={`$${availableSpending.toLocaleString()}`} />
            </div>
          </Card>

          {/* Recurring expenses manager (right) */}
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
                      onChange={(e) => setNewExp((p) => ({ ...p, amount: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Frequency</label>
                    <select className={selCls} value={newExp.frequency}
                      onChange={(e) => setNewExp((p) => ({ ...p, frequency: e.target.value as RecurringExpense['frequency'] }))}>
                      {FREQ_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Account</label>
                    <select className={selCls} value={newExp.sourceAccount}
                      onChange={(e) => setNewExp((p) => ({ ...p, sourceAccount: e.target.value }))}>
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
                  <button onClick={() => setShowAdd(false)}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Expense list */}
            <div className="space-y-2">
              {sortedExpenses.map((expense) => {
                const due = isRecurringExpenseDue(expense, periodIndex)
                const isEditing = editingId === expense.id

                if (isEditing && draftExp) {
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
                            onChange={(e) => setDraftExp((p) => p ? { ...p, amount: Number(e.target.value) } : p)} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Frequency</label>
                          <select className={selCls} value={draftExp.frequency}
                            onChange={(e) => setDraftExp((p) => p ? { ...p, frequency: e.target.value as RecurringExpense['frequency'] } : p)}>
                            {FREQ_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
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
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={saveEditExp}
                          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                          Save
                        </button>
                        <button onClick={cancelEditExp}
                          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Cancel
                        </button>
                        <button onClick={() => deleteExp(expense.id)}
                          className="ml-auto rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={expense.id}
                    className={`flex items-center gap-3 rounded-xl border-l-4 pl-3 pr-4 py-3 text-sm ${getColorClasses(accounts.find(a => a.id === expense.sourceAccount)?.color).border} ${due ? 'bg-slate-50' : 'bg-white opacity-50'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-slate-900">{expense.name}</p>
                        {due && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">due</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {accountName(expense.sourceAccount)} · {expense.frequency}
                        {expense.dueDate ? <span className="ml-1 text-slate-300">· due {expense.dueDate}</span> : null}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-slate-900">${expense.amount.toLocaleString()}</p>
                    <button
                      onClick={() => startEditExp(expense)}
                      className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}
