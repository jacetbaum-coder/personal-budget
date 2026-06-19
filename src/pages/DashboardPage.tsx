import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import Section from '../components/Section'
import Sparkline from '../components/Sparkline'
import { CHECKING_BUFFER, SAVINGS_BUFFER } from '../calculations'
import { useAppState } from '../state'
import { isRecurringExpenseDue } from '../recurring'

function daysUntilPayday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function paydayBadge(dateStr: string): string {
  const days = daysUntilPayday(dateStr)
  if (days === 0) return 'Payday today!'
  if (days === 1) return 'Payday tomorrow'
  if (days > 0) return `Payday in ${days}d`
  return `Paid ${Math.abs(days)}d ago`
}

const CHECKLIST_STORAGE_PREFIX = 'budget-os/checklist'

function readChecklistSteps(payPeriodId: number, autoStep1: boolean): Set<number> {
  try {
    const raw = localStorage.getItem(`${CHECKLIST_STORAGE_PREFIX}/${payPeriodId}`)
    if (!raw) return autoStep1 ? new Set([1]) : new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return autoStep1 ? new Set([1]) : new Set()
    return new Set(parsed.filter((value) => typeof value === 'number'))
  } catch {
    return autoStep1 ? new Set([1]) : new Set()
  }
}

export default function DashboardPage() {
  const {
    accounts,
    forecastPoints,
    payPeriods,
    recurringExpenses,
    selectedPayPeriodId,
    getExpenseSettlementStatus,
    getRecurringTotals,
  } = useAppState()

  if (payPeriods.length === 0) {
    return (
      <div className="space-y-6">
        <Section title="Dashboard" description="What do I need to do right now?">
          <Card title="No pay periods yet" subtitle="Add a pay period to see the current budget checklist.">
            <p className="text-sm text-slate-600">Once you add at least one pay period, this page will show the current-period action checklist.</p>
          </Card>
        </Section>
      </div>
    )
  }

  const selectedPeriod = payPeriods.find((p) => p.id === selectedPayPeriodId) ?? payPeriods[0]
  const periodIndex = payPeriods.findIndex((p) => p.id === selectedPeriod.id)
  const recurringTotals = getRecurringTotals(periodIndex)
  const cashAppTransfer = recurringTotals.groceries + recurringTotals.bus

  const defaultSavingsStart = accounts.find((a) => a.id === 'savings')?.balance ?? 0
  const defaultCheckingStart = accounts.find((a) => a.id === 'checking')?.balance ?? 0
  const startSavings = selectedPeriod.startingBalances?.savings ?? defaultSavingsStart
  const startChecking = selectedPeriod.startingBalances?.checking ?? defaultCheckingStart

  const savingsExpensesTotal = recurringTotals.fromSavings
  const subscriptionTotal = recurringTotals.fromChecking

  const baseTransferToCheckings =
    startSavings +
    selectedPeriod.payAmount -
    selectedPeriod.transfers.rent -
    selectedPeriod.transfers.openbank -
    savingsExpensesTotal -
    SAVINGS_BUFFER

  const remainingPool =
    startChecking +
    baseTransferToCheckings -
    subscriptionTotal -
    cashAppTransfer -
    CHECKING_BUFFER

  const maxSpendingForPeriod = remainingPool > 0 ? remainingPool : 0
  const savedSpendingChoice = selectedPeriod.spendingMoneyTarget
  const availableSpending =
    remainingPool > 0
      ? Math.max(0, Math.min(maxSpendingForPeriod, savedSpendingChoice ?? maxSpendingForPeriod))
      : remainingPool

  const extraToOpenBank = remainingPool > 0 ? remainingPool - availableSpending : 0
  const totalOpenBankTransfer = selectedPeriod.transfers.openbank + extraToOpenBank
  const transferToCheckings = baseTransferToCheckings - extraToOpenBank
  const projectedLeftover =
    startSavings +
    selectedPeriod.payAmount -
    selectedPeriod.transfers.rent -
    totalOpenBankTransfer -
    savingsExpensesTotal

  const dueSavingsExpenses = useMemo(
    () =>
      recurringExpenses.filter(
        (e) =>
          isRecurringExpenseDue(e, periodIndex, payPeriods) &&
          e.sourceAccount === 'savings' &&
          getExpenseSettlementStatus(selectedPeriod.id, e.id) !== 'paidAlready'
      ),
    [getExpenseSettlementStatus, payPeriods, recurringExpenses, periodIndex, selectedPeriod.id]
  )

  const overage = Math.max(0, -remainingPool)
  const negativeTransfer = transferToCheckings < 0

  // Sparkline
  const [seriesTarget, setSeriesTarget] = React.useState<string>('checking')
  const sortedForecast = (forecastPoints ?? []).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const buildSeries = (accountId: string) => {
    if (!sortedForecast.length) return [] as number[]
    if (accountId === 'total') {
      let cur = accounts.reduce((s, a) => s + a.balance, 0)
      return sortedForecast.map((pt) => { cur += Object.values(pt.balanceAdjustments ?? {}).reduce((s, v) => s + (v ?? 0), 0); return cur })
    }
    const base = accounts.find((a) => a.id === accountId)?.balance ?? 0
    let cur = base
    return sortedForecast.map((pt) => { cur += (pt.balanceAdjustments as any)?.[accountId] ?? 0; return cur })
  }
  const sparkData = buildSeries(seriesTarget)

  const badge = paydayBadge(selectedPeriod.payDate)
  const isToday = daysUntilPayday(selectedPeriod.payDate) === 0

  // Step 1 auto-done on/after payday; steps 2-6 user-controlled
  const autoStep1 = isToday || daysUntilPayday(selectedPeriod.payDate) < 0
  const [doneSteps, setDoneSteps] = useState<Set<number>>(() => readChecklistSteps(selectedPeriod.id, autoStep1))

  useEffect(() => {
    setDoneSteps(readChecklistSteps(selectedPeriod.id, autoStep1))
  }, [selectedPeriod.id, autoStep1])

  useEffect(() => {
    localStorage.setItem(
      `${CHECKLIST_STORAGE_PREFIX}/${selectedPeriod.id}`,
      JSON.stringify(Array.from(doneSteps.values()).sort((a, b) => a - b)),
    )
  }, [selectedPeriod.id, doneSteps])

  const toggleStep = (n: number) => setDoneSteps((prev) => {
    const next = new Set(prev)
    next.has(n) ? next.delete(n) : next.add(n)
    return next
  })

  return (
    <div className="space-y-6">
      {/* Hero bar */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Current period</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{selectedPeriod.label}</h2>
            <p className="mt-1 text-sm text-slate-500">${selectedPeriod.payAmount.toLocaleString()} incoming · ${availableSpending.toLocaleString()} spending</p>
          </div>
          <div className={`inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold ${isToday ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-900'}`}>
            {badge}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Checklist — primary job */}
        <Card title="Payday Checklist" subtitle={`Steps to execute for the ${selectedPeriod.label} period. Click any step to mark it done.`}>
          <div className="space-y-2 text-sm leading-6 text-slate-700">
            <CheckStep n={1} done={doneSteps.has(1)} onToggle={() => toggleStep(1)}>
              Paycheck (${selectedPeriod.payAmount.toLocaleString()}) lands in BofA Savings.
            </CheckStep>
            <CheckStep n={2} done={doneSteps.has(2)} onToggle={() => toggleStep(2)}>
              Transfer ${selectedPeriod.transfers.rent.toLocaleString()} → BofA Rent Holdings.
            </CheckStep>
            <CheckStep n={3} done={doneSteps.has(3)} onToggle={() => toggleStep(3)}>
              Transfer ${totalOpenBankTransfer.toLocaleString()} → OpenBank.
            </CheckStep>
            <CheckStep n={4} done={doneSteps.has(4)} onToggle={() => toggleStep(4)}>
              Pay savings expenses due this period:
              <ul className="mt-2 space-y-1.5 pl-4">
                {dueSavingsExpenses.length > 0 ? (
                  dueSavingsExpenses.map((expense) => (
                    <li key={expense.id} className="list-disc marker:text-slate-400">
                      {expense.name} — ${expense.amount.toLocaleString()}
                    </li>
                  ))
                ) : (
                  <li className="list-disc text-slate-400">No savings expenses due this period.</li>
                )}
              </ul>
            </CheckStep>
            <CheckStep n={5} done={doneSteps.has(5)} onToggle={() => toggleStep(5)}>
              Transfer ${transferToCheckings.toLocaleString()} → BofA Checkings.
              <span className="ml-1 text-xs opacity-60">(includes your saved pool split)</span>
            </CheckStep>
            <CheckStep n={6} done={doneSteps.has(6)} onToggle={() => toggleStep(6)}>
              From Checkings, load ${cashAppTransfer.toLocaleString()} → CashApp.
              <span className="ml-1 text-xs opacity-60">${recurringTotals.groceries} groceries + ${recurringTotals.bus} bus</span>
            </CheckStep>

            {(overage > 0 || negativeTransfer) && (
              <div className="mt-1 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                {overage > 0 && <p className="font-semibold">⚠ Outflows exceed paycheck by ${overage.toLocaleString()}.</p>}
                {negativeTransfer && <p className="font-semibold">⚠ Transfer to Checkings is negative — review amounts.</p>}
              </div>
            )}
          </div>
        </Card>

        {/* Right column: spending summary + sparkline */}
        <div className="space-y-6">
          <Card title="Spending summary" subtitle={`${selectedPeriod.label} · ${selectedPeriod.payDate}`}>
            <div className="space-y-3">
              <SummaryRow label="Paycheck" value={`$${selectedPeriod.payAmount.toLocaleString()}`} />
              <SummaryRow label="Starting (Savings + Checkings)" value={`$${(startSavings + startChecking).toLocaleString()}`} />
              <SummaryRow label="Rent transfer" value={`−$${selectedPeriod.transfers.rent.toLocaleString()}`} dim />
              <SummaryRow label="OpenBank transfer" value={`−$${totalOpenBankTransfer.toLocaleString()}`} dim />
              <SummaryRow label="Savings expenses" value={`−$${savingsExpensesTotal.toLocaleString()}`} dim />
              <div className="my-1 border-t border-slate-100" />
              <SummaryRow label="Projected leftover" value={`$${projectedLeftover.toLocaleString()}`} bold />
              <SummaryRow label="Buffer — BofA Savings" value={`−$${SAVINGS_BUFFER}`} dim />
              <SummaryRow label="Buffer — BofA Checkings" value={`−$${CHECKING_BUFFER}`} dim />
              <SummaryRow label="Available to spend" value={`$${availableSpending.toLocaleString()}`} bold highlight />
              <div className="my-1 border-t border-slate-100" />
              <SummaryRow label="Transfer to Checkings" value={`$${transferToCheckings.toLocaleString()}`} />
              <SummaryRow label="CashApp load" value={`$${cashAppTransfer.toLocaleString()}`} />
            </div>
          </Card>

          {sparkData.length > 0 && (
            <Card title="Balance trend">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400">Projected trajectory</p>
                <select
                  value={seriesTarget}
                  onChange={(e) => setSeriesTarget(e.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
                >
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  <option value="total">Total (all accounts)</option>
                </select>
              </div>
              <div className="h-20 w-full">
                <Sparkline data={sparkData} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckStep({ n, done = false, onToggle, children }: { n: number; done?: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full rounded-2xl p-4 text-left transition-colors ${done ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100' : 'bg-slate-50 text-slate-900 hover:bg-slate-100'}`}
    >
      <p className="font-semibold flex items-start gap-2">
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 text-slate-400'}`}>
          {done ? '✓' : n}
        </span>
        <span>{children}</span>
      </p>
    </button>
  )
}

function SummaryRow({ label, value, dim, bold, highlight }: { label: string; value: string; dim?: boolean; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${highlight ? 'rounded-xl bg-slate-900 px-3 py-2 text-white' : ''}`}>
      <span className={dim ? 'text-slate-400' : bold ? 'font-medium text-slate-700' : 'text-slate-600'}>{label}</span>
      <span className={dim ? 'text-slate-400' : bold ? 'font-semibold text-slate-900' : 'text-slate-900'}>{highlight ? <span className="text-white font-semibold">{value}</span> : value}</span>
    </div>
  )
}
