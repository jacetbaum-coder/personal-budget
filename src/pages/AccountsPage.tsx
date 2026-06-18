import { ChangeEvent, useState } from 'react'
import Card from '../components/Card'
import Section from '../components/Section'
import { useAppState } from '../state'
import { isRecurringExpenseDue } from '../recurring'
import type { Account, RecurringExpense } from '../models'

const frequencyOptions: RecurringExpense['frequency'][] = ['Every paycheck', 'Every other paycheck', 'Monthly', 'Custom']

export default function AccountsPage() {
  const { accounts, setAccounts, recurringExpenses, setRecurringExpenses } = useAppState()
  const [editMode, setEditMode] = useState(false)
  const [draftAccounts, setDraftAccounts] = useState<Account[]>(accounts)
  const [draftExpenses, setDraftExpenses] = useState<RecurringExpense[]>(recurringExpenses)

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
  const draftTotalBalance = draftAccounts.reduce((sum, account) => sum + account.balance, 0)

  const startEdit = () => {
    setDraftAccounts(accounts)
    setDraftExpenses(recurringExpenses)
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
  }

  const saveChanges = () => {
    setAccounts(draftAccounts)
    setRecurringExpenses(draftExpenses)
    setEditMode(false)
  }

  const updateDraftBalance = (id: string, value: number) => {
    setDraftAccounts(draftAccounts.map((account) => (account.id === id ? { ...account, balance: value } : account)))
  }

  const updateDraftExpense = (id: number, field: 'amount' | 'frequency', value: number | RecurringExpense['frequency']) => {
    setDraftExpenses((current) =>
      current.map((expense) =>
        expense.id === id
          ? {
              ...expense,
              amount: field === 'amount' ? (value as number) : expense.amount,
              frequency: field === 'frequency' ? (value as RecurringExpense['frequency']) : expense.frequency
            }
          : expense
      )
    )
  }

  const displayedAccounts = editMode ? draftAccounts : accounts
  const displayedExpenses = editMode ? draftExpenses : recurringExpenses
  const displayedTotalBalance = editMode ? draftTotalBalance : totalBalance

  return (
    <div className={`space-y-5 transition-colors ${editMode ? 'rounded-[1.75rem] bg-slate-50/50 p-5' : ''}`}>
      <div className={`rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/50 transition ${editMode ? 'ring-2 ring-slate-300/70' : ''}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Accounts</h1>
            <p className="text-sm text-slate-500">Track balances and account types for your forecasting model.</p>
            {editMode ? <p className="text-sm text-slate-500">Edit mode is active. Save your changes when finished.</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {editMode ? (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveChanges}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Save changes
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Edit accounts
              </button>
            )}
          </div>
        </div>
      </div>

      <Section
        title="Accounts"
        description={editMode ? 'Edit balances and recurring expenses in a dedicated edit screen.' : 'Quick overview of balances and recurring spending.'}
      >
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Card title="Account summary" subtitle="All balances and liquidity.">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="grid gap-3 sm:grid-cols-3">
                  {displayedAccounts.map((account) => (
                    <div key={account.id} className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                      {editMode ? (
                        <input
                          type="number"
                          value={account.balance}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraftBalance(account.id, Number(event.target.value))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-2xl font-semibold text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                        />
                      ) : (
                        <p className="mt-3 text-3xl font-semibold text-slate-900">${account.balance.toLocaleString()}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="rounded-3xl bg-slate-950 p-4 text-white">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Total balance</p>
                  <p className="mt-2 text-3xl font-semibold">${displayedTotalBalance.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card
              title={editMode ? 'Edit recurring expenses' : 'Recurring expenses'}
              subtitle={editMode ? 'Editable mock data for recurring bills.' : 'Recurring spending you track in the model.'}
            >
              <div className="space-y-3">
                {displayedExpenses.map((expense) => (
                  <div key={expense.id} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[2fr_1fr_1fr]">
                    <div>
                      <p className="font-semibold text-slate-900">{expense.name}</p>
                      <p className="text-sm text-slate-500">
                        {isRecurringExpenseDue(expense, 0) ? 'Included this period' : 'Skipped this period'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Amount</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={expense.amount}
                          onChange={(event) => updateDraftExpense(expense.id, 'amount', Number(event.target.value))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                        />
                      ) : (
                        <p className="mt-2 text-lg font-semibold text-slate-900">${expense.amount.toLocaleString()}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Frequency</label>
                      {editMode ? (
                        <select
                          value={expense.frequency}
                          onChange={(event) => updateDraftExpense(expense.id, 'frequency', event.target.value as RecurringExpense['frequency'])}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                        >
                          {frequencyOptions.map((frequency) => (
                            <option key={frequency} value={frequency}>
                              {frequency}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-2 text-lg font-semibold text-slate-900">{expense.frequency}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Connected accounts">
              <div className="space-y-3 text-sm text-slate-600">
                {displayedAccounts.map((account) => (
                  <p key={account.id}>
                    {account.name} • ${account.balance.toLocaleString()}
                  </p>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Section>
    </div>
  )
}
