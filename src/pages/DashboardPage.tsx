import React, { useMemo } from 'react'
import Card from '../components/Card'
import InfoRow from '../components/InfoRow'
import Section from '../components/Section'
import Sparkline from '../components/Sparkline'
import { useAppState } from '../state'
import { isRecurringExpenseDue } from '../recurring'

export default function DashboardPage() {
  const {
    accounts,
    forecastPoints,
    payPeriods,
    recurringExpenses,
    selectedPayPeriodId,
    dashboardButtonText,
    getProjectedLeftover,
    getAvailableSpending,
    getSafetyBuffer,
    getCashAppTransfer,
    getRecurringTotals
  } = useAppState()

  if (payPeriods.length === 0) {
    return (
      <div className="space-y-6">
        <Section title="Dashboard" description="A calmer dashboard with the most useful information for your next paycheck.">
          <Card title="No pay periods yet" subtitle="Add a pay period to see the current budget sheet.">
            <p className="text-sm text-slate-600">Once you add at least one pay period, this dashboard will show the current pay period checklist and cashflow summary.</p>
          </Card>
        </Section>
      </div>
    )
  }

  const selectedPeriod = payPeriods.find((period) => period.id === selectedPayPeriodId) ?? payPeriods[0]
  const periodIndex = payPeriods.findIndex((period) => period.id === selectedPeriod.id)
  const recurringTotals = getRecurringTotals(periodIndex)
  const projectedLeftover = getProjectedLeftover(selectedPeriod, recurringTotals)
  const cashAppTransfer = getCashAppTransfer(recurringTotals)
  const safetyBuffer = getSafetyBuffer(projectedLeftover)
  const availableSpending = getAvailableSpending(projectedLeftover)

  const sortedForecast = (forecastPoints ?? []).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const buildSeriesFor = (accountId?: string) => {
    if (!sortedForecast.length) return [] as number[]
    if (accountId === 'total' || !accountId) {
      const starting = accounts.reduce((sum, account) => sum + account.balance, 0)
      let current = starting
      return sortedForecast.map((point) => {
        const delta = Object.values(point.balanceAdjustments ?? {}).reduce((sum, value) => sum + (value ?? 0), 0)
        current += delta
        return current
      })
    }

    const account = accounts.find((item) => item.id === accountId)
    const starting = account?.balance ?? 0
    let current = starting
    return sortedForecast.map((point) => {
      const delta = (point.balanceAdjustments as any)?.[accountId] ?? 0
      current += delta
      return current
    })
  }

  const [seriesTarget, setSeriesTarget] = React.useState<string | 'total'>('checking')
  const checkingSeries = buildSeriesFor(seriesTarget)

  const dueSavingsExpenses = useMemo(
    () => recurringExpenses.filter((expense) => isRecurringExpenseDue(expense, periodIndex) && expense.sourceAccount === 'savings'),
    [recurringExpenses, periodIndex]
  )

  const savingsExpensesTotal = recurringTotals.fromSavings
  const subscriptionTotal = recurringTotals.fromChecking
  const transferToCheckings = cashAppTransfer + subscriptionTotal + availableSpending
  const outflows = selectedPeriod.transfers.rent + selectedPeriod.transfers.openbank + savingsExpensesTotal + transferToCheckings
  const overage = Math.max(0, outflows - selectedPeriod.payAmount)
  const negativeTransfer = transferToCheckings < 0

  return (
    <div className="space-y-6">
      <Section title="Dashboard" description="A calmer dashboard with the most useful information for your next paycheck.">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="xl:col-span-2">
            <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">Cashflow overview</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    This page shows the single most important numbers for your upcoming pay period: how much you can safely spend and what is already committed.
                  </p>
                </div>
                <button className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm shadow-slate-200/50 hover:bg-slate-50">
                  {dashboardButtonText}
                </button>
              </div>
            </div>
          </div>

          <Card title="Current Spend" subtitle="This month" className="xl:col-span-1">
            <div className="rounded-lg bg-slate-50 p-4 text-slate-900 shadow-sm shadow-slate-200/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current spend</p>
                  <p className="mt-2 text-3xl font-semibold">${availableSpending.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-500">{dashboardButtonText}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <select
                    value={seriesTarget}
                    onChange={(e) => setSeriesTarget(e.target.value as any)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                    <option value="total">Total (all accounts)</option>
                  </select>
                  <div className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-medium text-slate-900">Payday in 5 days</div>
                </div>
              </div>

              <div className="mt-4 h-20 w-full rounded-lg">
                <Sparkline data={checkingSeries} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <p className="text-xs text-slate-500">Reserved</p>
                  <p className="mt-1 text-lg font-semibold">${safetyBuffer.toLocaleString()}</p>
                </div>
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <p className="text-xs text-slate-500">Available</p>
                  <p className="mt-1 text-lg font-semibold">${availableSpending.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card title="Accounts" subtitle="Live balances">
              <div className="space-y-2 text-sm text-slate-700">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
                    <div className="text-sm text-slate-700">{account.name}</div>
                    <div className="text-sm font-semibold text-slate-900">${account.balance.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Next Paycheck" subtitle="Planned transfers and commitments for the upcoming deposit.">
              <div className="grid gap-4">
                <InfoRow label="Pay Amount" value={`$${selectedPeriod.payAmount.toLocaleString()}`} note="Expected net income" />
                <InfoRow label="Rent Transfer" value={`$${selectedPeriod.transfers.rent.toLocaleString()}`} />
                <InfoRow label="OpenBank Transfer" value={`$${selectedPeriod.transfers.openbank.toLocaleString()}`} />
                <InfoRow label="Savings Expenses" value={`$${savingsExpensesTotal.toLocaleString()}`} note="Due this period from savings" />
                <InfoRow label="Subscriptions (Checkings)" value={`$${subscriptionTotal.toLocaleString()}`} />
                <InfoRow label="CashApp Load" value={`$${cashAppTransfer.toLocaleString()}`} note={`$${recurringTotals.groceries} groceries + $${recurringTotals.bus} bus`} />
                <div className="rounded-3xl bg-slate-50 p-5 shadow-sm shadow-slate-200/40">
                  <p className="text-sm font-medium text-slate-500">Projected Leftover</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">${projectedLeftover.toLocaleString()}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 shadow-sm shadow-slate-200/40">
                  <p className="text-sm font-medium text-slate-500">CashApp Transfer</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">${cashAppTransfer.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card title="Upcoming Pay Period Checklist" subtitle="Follow these steps in order for the selected period.">
              <div className="space-y-4 text-sm leading-6 text-slate-700">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">1. ✅ Paycheck (${selectedPeriod.payAmount.toLocaleString()}) lands in BofA Savings.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">2. Transfer ${selectedPeriod.transfers.rent.toLocaleString()} → BofA Rent Holdings.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">3. Transfer ${selectedPeriod.transfers.openbank.toLocaleString()} → OpenBank.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">4. Pay the savings expenses due this period:</p>
                  <ul className="mt-2 space-y-2 pl-4 text-slate-700">
                    {dueSavingsExpenses.length > 0 ? (
                      dueSavingsExpenses.map((expense) => (
                        <li key={expense.id} className="marker:text-slate-500 list-disc">
                          {expense.name} — ${expense.amount.toLocaleString()}
                        </li>
                      ))
                    ) : (
                      <li className="list-disc text-slate-500">No savings expenses are due this period.</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">5. Transfer ${transferToCheckings.toLocaleString()} → BofA Checkings.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    6. From Checkings, load ${cashAppTransfer.toLocaleString()} → CashApp ({`$${recurringTotals.groceries} groceries + $${recurringTotals.bus} bus`} ).
                  </p>
                </div>
                {(overage > 0 || negativeTransfer) && (
                  <div className="rounded-3xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                    {overage > 0 ? (
                      <p className="font-semibold">Warning: outflows exceed the paycheck by ${overage.toLocaleString()}.</p>
                    ) : null}
                    {negativeTransfer ? <p className="font-semibold">Warning: Transfer to Checkings is negative; review the checklist amounts.</p> : null}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </Section>
    </div>
  )
}