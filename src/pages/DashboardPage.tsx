import React from 'react'
import Card from '../components/Card'
import InfoRow from '../components/InfoRow'
import Section from '../components/Section'
import Sparkline from '../components/Sparkline'
import { useAppState } from '../state'

export default function DashboardPage() {
  const {
    accounts,
    forecastPoints,
    payPeriods,
    selectedPayPeriodId,
    dashboardHeading,
    dashboardButtonText,
    getProjectedLeftover,
    getAvailableSpending,
    getSafetyBuffer,
    getCashAppTransfer,
    getRecurringTotals
  } = useAppState()

  const selectedPeriod = payPeriods.find((period) => period.id === selectedPayPeriodId) ?? payPeriods[0]
  const periodIndex = payPeriods.findIndex((period) => period.id === selectedPeriod.id)
  const recurringTotals = getRecurringTotals(periodIndex)
  const projectedLeftover = getProjectedLeftover(selectedPeriod, recurringTotals)
  const cashAppTransfer = getCashAppTransfer(recurringTotals)
  const safetyBuffer = getSafetyBuffer(projectedLeftover)
  const availableSpending = getAvailableSpending(projectedLeftover)

  const sortedForecast = (forecastPoints ?? []).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // helper to build cumulative series for a given account id
  const buildSeriesFor = (accountId?: string) => {
    if (!sortedForecast.length) return [] as number[]
    if (accountId === 'total' || !accountId) {
      // sum across accounts
      const starting = accounts.reduce((s, a) => s + a.balance, 0)
      let cur = starting
      return sortedForecast.map((p) => {
        const delta = Object.values(p.balanceAdjustments ?? {}).reduce((s, v) => s + (v ?? 0), 0)
        cur = cur + delta
        return cur
      })
    }

    const acct = accounts.find((a) => a.id === accountId)
    const starting = acct?.balance ?? 0
    let cur = starting
    return sortedForecast.map((p) => {
      const delta = (p.balanceAdjustments as any)?.[accountId] ?? 0
      cur = cur + delta
      return cur
    })
  }

  const [seriesTarget, setSeriesTarget] = React.useState<string | 'total'>('checking')
  const checkingSeries = buildSeriesFor(seriesTarget)
  const labels = sortedForecast.map((p) => p.dateLabel)

  return (
    <div className="space-y-6">
      <Section title="Dashboard" description="A calmer dashboard with just the most useful information for your next paycheck.">
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
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="openbank">Openbank</option>
                    <option value="rentFund">Rent Fund</option>
                    <option value="cashApp">CashApp</option>
                    <option value="total">Total</option>
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
                <InfoRow label="Openbank Transfer" value={`$${selectedPeriod.transfers.openbank.toLocaleString()}`} />
                <InfoRow label="Credit Cards" value={`$${recurringTotals.creditCards.toLocaleString()}`} />
                <InfoRow label="Subscriptions" value={`$${(recurringTotals.spotify + recurringTotals.amazon + recurringTotals.other).toLocaleString()}`} />
                <InfoRow label="Insurance" value={`$${recurringTotals.insurance.toLocaleString()}`} />
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
          </div>
        </div>
      </Section>

    </div>
  )
}
