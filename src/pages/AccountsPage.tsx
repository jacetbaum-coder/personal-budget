import { ChangeEvent } from 'react'
import Card from '../components/Card'
import Section from '../components/Section'
import { useAppState } from '../state'
import { isRecurringExpenseDue } from '../recurring'
import type { RecurringExpense } from '../models'

const frequencyOptions: RecurringExpense['frequency'][] = ['Every paycheck', 'Every other paycheck', 'Monthly', 'Custom']

export default function AccountsPage() {
  const { accounts, setAccounts, recurringExpenses, setRecurringExpenses } = useAppState()

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  const updateBalance = (id: string, value: number) => {
    setAccounts(accounts.map((account) => (account.id === id ? { ...account, balance: value } : account)))
  }

  const updateExpense = (id: number, field: 'amount' | 'frequency', value: number | RecurringExpense['frequency']) => {
    setRecurringExpenses((current) =>
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

  return (
    <div className="space-y-6">
      <Section title="Accounts" description="Track balances and account types for your forecasting model.">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card title="Account summary" subtitle="All balances and liquidity.">
              <div className="space-y-4 text-sm text-slate-600">
                <div className="grid gap-3 sm:grid-cols-3">
                  {accounts.map((account) => (
                    <div key={account.id} className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                      <input
                        type="number"
                        value={account.balance}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateBalance(account.id, Number(event.target.value))}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-2xl font-semibold text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="rounded-3xl bg-slate-950 p-4 text-white">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Total balance</p>
                  <p className="mt-2 text-3xl font-semibold">${totalBalance.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card title="Recurring expenses" subtitle="Editable mock data for recurring bills.">
              <div className="space-y-3">
                {recurringExpenses.map((expense) => (
                  <div key={expense.id} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[2fr_1fr_1fr]">
                    <div>
                      <p className="font-semibold text-slate-900">{expense.name}</p>
                      <p className="text-sm text-slate-500">
                        {isRecurringExpenseDue(expense, 0) ? 'Included this period' : 'Skipped this period'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Amount</label>
                      <input
                        type="number"
                        value={expense.amount}
                        onChange={(event) => updateExpense(expense.id, 'amount', Number(event.target.value))}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Frequency</label>
                      <select
                        value={expense.frequency}
                        onChange={(event) => updateExpense(expense.id, 'frequency', event.target.value as RecurringExpense['frequency'])}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                      >
                        {frequencyOptions.map((frequency) => (
                          <option key={frequency} value={frequency}>
                            {frequency}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Connected accounts">
              <div className="space-y-3 text-sm text-slate-600">
                {accounts.map((account) => (
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
