import { useState } from 'react'
import Card from '../components/Card'
import Section from '../components/Section'
import { useAppState } from '../state'
import { isRecurringExpenseDue } from '../recurring'
import type { Account, AccountId, ExpenseCategory, RecurringExpense } from '../models'
import { expenseCategoryLabels } from '../models'

const frequencyOptions: RecurringExpense['frequency'][] = ['Every paycheck', 'Every other paycheck', 'Monthly', 'Custom']
const categoryOptions = Object.entries(expenseCategoryLabels) as [ExpenseCategory, string][]

const blankExpense = (): Omit<RecurringExpense, 'id'> => ({
  name: '',
  amount: 0,
  frequency: 'Every paycheck',
  category: 'other',
  sourceAccount: 'savings',
})

const blankAccount = (): Omit<Account, 'id'> => ({ name: '', balance: 0 })

export default function AccountsPage() {
  const { accounts, setAccounts, recurringExpenses, setRecurringExpenses } = useAppState()
  const [editMode, setEditMode] = useState(false)
  const [draftAccounts, setDraftAccounts] = useState<Account[]>(accounts)
  const [draftExpenses, setDraftExpenses] = useState<RecurringExpense[]>(recurringExpenses)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newExpense, setNewExpense] = useState<Omit<RecurringExpense, 'id'>>(blankExpense())
  const [newAccount, setNewAccount] = useState<Omit<Account, 'id'>>(blankAccount())

  const startEdit = () => {
    setDraftAccounts(accounts)
    setDraftExpenses(recurringExpenses)
    setShowAddExpense(false)
    setShowAddAccount(false)
    setEditMode(true)
  }

  const cancelEdit = () => {
    setShowAddExpense(false)
    setShowAddAccount(false)
    setEditMode(false)
  }

  const saveChanges = () => {
    setAccounts(draftAccounts)
    setRecurringExpenses(draftExpenses)
    setShowAddExpense(false)
    setShowAddAccount(false)
    setEditMode(false)
  }

  // ── Account helpers ─────────────────────────────────────────────────────────
  const updateDraftAccount = (id: AccountId, patch: Partial<Account>) =>
    setDraftAccounts((curr) => curr.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const removeDraftAccount = (id: AccountId) =>
    setDraftAccounts((curr) => curr.filter((a) => a.id !== id))

  const commitAddAccount = () => {
    if (!newAccount.name.trim()) return
    const id = newAccount.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setDraftAccounts((curr) => [...curr, { id, ...newAccount }])
    setNewAccount(blankAccount())
    setShowAddAccount(false)
  }

  // ── Expense helpers ─────────────────────────────────────────────────────────
  const updateDraftExpense = (id: number, patch: Partial<RecurringExpense>) =>
    setDraftExpenses((curr) => curr.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const removeDraftExpense = (id: number) =>
    setDraftExpenses((curr) => curr.filter((e) => e.id !== id))

  const commitAddExpense = () => {
    if (!newExpense.name.trim()) return
    setDraftExpenses((curr) => [...curr, { id: Date.now(), ...newExpense }])
    setNewExpense(blankExpense())
    setShowAddExpense(false)
  }

  const displayedAccounts = editMode ? draftAccounts : accounts
  const displayedExpenses = editMode ? draftExpenses : recurringExpenses
  const displayedTotal = displayedAccounts.reduce((s, a) => s + a.balance, 0)

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none'
  const accountName = (id: AccountId) => displayedAccounts.find((a) => a.id === id)?.name ?? id

  return (
    <div className={`space-y-5 transition-colors ${editMode ? 'rounded-[1.75rem] bg-slate-50/50 p-5' : ''}`}>
      {/* Header */}
      <div className={`rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/50 ${editMode ? 'ring-2 ring-slate-300/70' : ''}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Accounts</h1>
            <p className="text-sm text-slate-500">
              {editMode ? 'Edit mode active — save when finished.' : 'Track balances and recurring expenses.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {editMode ? (
              <>
                <button type="button" onClick={cancelEdit}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="button" onClick={saveChanges}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Save changes
                </button>
              </>
            ) : (
              <button type="button" onClick={startEdit}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Edit accounts
              </button>
            )}
          </div>
        </div>
      </div>

      <Section title="Accounts & Expenses" description="Manage balances, add or remove accounts, and configure recurring spending.">
        <div className="space-y-5">

          {/* ── Accounts ─────────────────────────────────────────────────── */}
          <Card
            title="Accounts"
            subtitle="Current balances"
            action={
              editMode && !showAddAccount ? (
                <button onClick={() => setShowAddAccount(true)}
                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800">
                  + Add account
                </button>
              ) : undefined
            }
          >
            {showAddAccount && (
              <div className="mb-4 rounded-2xl border border-slate-300 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-900">New account</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Name</label>
                    <input className={inputCls} placeholder="e.g. Chase Savings" value={newAccount.name}
                      onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Balance ($)</label>
                    <input type="number" className={inputCls} value={newAccount.balance}
                      onChange={(e) => setNewAccount((p) => ({ ...p, balance: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={commitAddAccount}
                    className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                    Add
                  </button>
                  <button onClick={() => setShowAddAccount(false)}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {displayedAccounts.map((account) => (
                <div key={account.id} className="rounded-2xl bg-slate-50 p-3">
                  {editMode ? (
                    <div className="space-y-2">
                      <input className={inputCls} value={account.name} placeholder="Account name"
                        onChange={(e) => updateDraftAccount(account.id, { name: e.target.value })} />
                      <input type="number" className={inputCls} value={account.balance}
                        onChange={(e) => updateDraftAccount(account.id, { balance: Number(e.target.value) })} />
                      <button onClick={() => removeDraftAccount(account.id)}
                        className="w-full rounded-xl border border-red-200 bg-red-50 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">${account.balance.toLocaleString()}</p>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-3xl bg-slate-950 p-4 text-white">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Total balance</p>
              <p className="mt-2 text-3xl font-semibold">${displayedTotal.toLocaleString()}</p>
            </div>
          </Card>

          {/* ── Recurring Expenses ───────────────────────────────────────── */}
          <Card
            title={editMode ? 'Edit recurring expenses' : 'Recurring expenses'}
            subtitle={editMode ? 'Edit name, amount, frequency, and account source.' : 'Bills and transfers tracked each pay period.'}
            action={
              editMode && !showAddExpense ? (
                <button onClick={() => setShowAddExpense(true)}
                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800">
                  + Add expense
                </button>
              ) : undefined
            }
          >
            {showAddExpense && (
              <div className="mb-4 rounded-2xl border border-slate-300 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-900">New recurring expense</p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Name</label>
                    <input className={inputCls} placeholder="e.g. Netflix" value={newExpense.name}
                      onChange={(e) => setNewExpense((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Amount ($)</label>
                    <input type="number" className={inputCls} value={newExpense.amount}
                      onChange={(e) => setNewExpense((p) => ({ ...p, amount: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Frequency</label>
                    <select className={inputCls} value={newExpense.frequency}
                      onChange={(e) => setNewExpense((p) => ({ ...p, frequency: e.target.value as RecurringExpense['frequency'] }))}>
                      {frequencyOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Account</label>
                    <select className={inputCls} value={newExpense.sourceAccount}
                      onChange={(e) => setNewExpense((p) => ({ ...p, sourceAccount: e.target.value }))}>
                      {draftAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Category</label>
                    <select className={inputCls} value={newExpense.category}
                      onChange={(e) => setNewExpense((p) => ({ ...p, category: e.target.value as ExpenseCategory }))}>
                      {categoryOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  {newExpense.frequency === 'Every other paycheck' && (
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Cycle</label>
                      <select className={inputCls} value={newExpense.cycleOffset ?? 0}
                        onChange={(e) => setNewExpense((p) => ({ ...p, cycleOffset: Number(e.target.value) }))}>
                        <option value={0}>Even periods (current)</option>
                        <option value={1}>Odd periods (next)</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={commitAddExpense}
                    className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                    Add
                  </button>
                  <button onClick={() => setShowAddExpense(false)}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {displayedExpenses.map((expense) => (
                <div key={expense.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  {editMode ? (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Name</label>
                        <input className={inputCls} value={expense.name}
                          onChange={(e) => updateDraftExpense(expense.id, { name: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Amount ($)</label>
                        <input type="number" className={inputCls} value={expense.amount}
                          onChange={(e) => updateDraftExpense(expense.id, { amount: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Frequency</label>
                        <select className={inputCls} value={expense.frequency}
                          onChange={(e) => updateDraftExpense(expense.id, { frequency: e.target.value as RecurringExpense['frequency'] })}>
                          {frequencyOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Account</label>
                        <select className={inputCls} value={expense.sourceAccount}
                          onChange={(e) => updateDraftExpense(expense.id, { sourceAccount: e.target.value })}>
                          {draftAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Category</label>
                        <select className={inputCls} value={expense.category}
                          onChange={(e) => updateDraftExpense(expense.id, { category: e.target.value as ExpenseCategory })}>
                          {categoryOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      {expense.frequency === 'Every other paycheck' && (
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Cycle</label>
                          <select className={inputCls} value={expense.cycleOffset ?? 0}
                            onChange={(e) => updateDraftExpense(expense.id, { cycleOffset: Number(e.target.value) })}>
                            <option value={0}>Even periods (current)</option>
                            <option value={1}>Odd periods (next)</option>
                          </select>
                        </div>
                      )}
                      <div className="flex items-end sm:col-span-2 md:col-span-1">
                        <button onClick={() => removeDraftExpense(expense.id)}
                          className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-medium text-red-600 hover:bg-red-100">
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{expense.name}</p>
                        <p className="text-sm text-slate-500">{accountName(expense.sourceAccount)} • {expense.frequency}</p>
                        {expense.frequency === 'Every other paycheck' && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {expense.cycleOffset === 1 ? 'Odd cycle' : 'Even cycle'} —{' '}
                            {isRecurringExpenseDue(expense, 0) ? 'due this period' : 'next period'}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-lg font-semibold text-slate-900">${expense.amount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

        </div>
      </Section>
    </div>
  )
}
