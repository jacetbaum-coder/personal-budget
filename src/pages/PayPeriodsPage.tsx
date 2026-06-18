import { useMemo } from 'react'
import Card from '../components/Card'
import InfoRow from '../components/InfoRow'
import Section from '../components/Section'
import {
  calculateAvailableSpending,
  calculateProjectedLeftover,
  calculateSafetyBuffer
} from '../calculations'
import { getRecurringExpenseTotals, isRecurringExpenseDue, type RecurringFrequency } from '../recurring'
import type { RecurringExpense } from '../models'
import { useAppState } from '../state'

const frequencyOptions: RecurringFrequency[] = ['Every paycheck', 'Every other paycheck', 'Monthly', 'Custom']

export default function PayPeriodsPage() {
  const {
    payPeriods,
    recurringExpenses,
    selectedPayPeriodId,
    setSelectedPayPeriodId,
    setRecurringExpenses,
    getRecurringTotals,
    getUpcomingRecurring
  } = useAppState()

  const selectedPeriod = useMemo(
    () => payPeriods.find((period) => period.id === selectedPayPeriodId) ?? payPeriods[0],
    [payPeriods, selectedPayPeriodId]
  )

  const periodIndex = useMemo(
    () => payPeriods.findIndex((period) => period.id === selectedPayPeriodId),
    [payPeriods, selectedPayPeriodId]
  )

  const recurringTotals = getRecurringTotals(periodIndex)
  const totalRecurringExpenses =
    recurringTotals.creditCards +
    recurringTotals.insurance +
    recurringTotals.spotify +
    recurringTotals.amazon +
    recurringTotals.other

  const projectedLeftover = calculateProjectedLeftover(
    selectedPeriod.payAmount,
    selectedPeriod.transfers.rent,
    selectedPeriod.transfers.openbank,
    recurringTotals.creditCards,
    recurringTotals.spotify + recurringTotals.amazon + recurringTotals.other,
    recurringTotals.insurance
  )

  const cashAppTransfer = recurringTotals.groceries + recurringTotals.bus
  const safetyBuffer = calculateSafetyBuffer(projectedLeftover)
  const availableSpending = calculateAvailableSpending(projectedLeftover, safetyBuffer)
  const upcomingOccurrences = getUpcomingRecurring(periodIndex, 6)

  const updateExpense = (id: number, field: 'amount' | 'frequency', value: number | RecurringFrequency) => {
    setRecurringExpenses((current: RecurringExpense[]) =>
      current.map((expense: RecurringExpense) =>
        expense.id === id
          ? {
              ...expense,
              amount: field === 'amount' ? (value as number) : expense.amount,
              frequency: field === 'frequency' ? (value as RecurringFrequency) : expense.frequency
            }
          : expense
      )
    )
  }

  return (
    <div className="space-y-6">
      <Section title="Pay Periods" description="The heart of your forecast system: recurring bills and pay period planning.">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {payPeriods.map((period) => {
                const periodTotals = getRecurringTotals(payPeriods.indexOf(period))
                const periodProjectedLeftover = calculateProjectedLeftover(
                  period.payAmount,
                  period.transfers.rent,
                  period.transfers.openbank,
                  periodTotals.creditCards,
                  periodTotals.spotify + periodTotals.amazon + periodTotals.other,
                  periodTotals.insurance
                )
                const periodSafety = calculateSafetyBuffer(periodProjectedLeftover)
                const periodAvailable = calculateAvailableSpending(periodProjectedLeftover, periodSafety)

                return (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => setSelectedPayPeriodId(period.id)}
                    className={`rounded-3xl border p-5 text-left shadow-sm transition focus:outline-none ${
                      period.id === selectedPayPeriodId
                        ? 'border-slate-900 bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{period.label}</p>
                    <p className="mt-4 text-3xl font-semibold">${period.payAmount.toLocaleString()}</p>
                    <p className="mt-3 text-sm text-slate-500">Pay date: {period.payDate}</p>
                    <div className="mt-4 space-y-2 text-sm">
                      <p>
                        Recurring expenses: <span className="font-semibold">${(periodTotals.creditCards + periodTotals.insurance + periodTotals.spotify + periodTotals.amazon + periodTotals.other).toLocaleString()}</span>
                      </p>
                      <p>
                        Available: <span className="font-semibold">${periodAvailable.toLocaleString()}</span>
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>


          <div className="space-y-4">
            <Card title="Selected pay period details" subtitle={`${selectedPeriod.label} • ${selectedPeriod.payDate}`}>
              <div className="space-y-4">
                <InfoRow label="Pay amount" value={`$${selectedPeriod.payAmount.toLocaleString()}`} />
                <InfoRow label="Rent transfer" value={`$${selectedPeriod.transfers.rent.toLocaleString()}`} />
                <InfoRow label="Openbank transfer" value={`$${selectedPeriod.transfers.openbank.toLocaleString()}`} />
                <InfoRow label="Recurring expense total" value={`$${totalRecurringExpenses.toLocaleString()}`} />
                <InfoRow label="Projected Leftover" value={`$${projectedLeftover.toLocaleString()}`} />
                <InfoRow label="Safety Buffer" value={`$${safetyBuffer.toLocaleString()}`} note={`${Math.round((safetyBuffer / projectedLeftover) * 100)}%`} />
                <InfoRow label="Available Spending" value={`$${availableSpending.toLocaleString()}`} />
              </div>
            </Card>

            <Card title="Upcoming occurrences" subtitle="Next recurring bills by pay period.">
              <div className="space-y-3">
                {upcomingOccurrences.map((item) => (
                  <div key={`${item.expense.id}-${item.periodIndex}`} className="rounded-3xl bg-slate-50 p-4 shadow-sm shadow-slate-200/40">
                    <p className="font-semibold text-slate-900">{item.expense.name}</p>
                    <p className="text-sm text-slate-500">Amount: ${item.expense.amount}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {item.expense.frequency} • Pay period {(item.periodIndex + 1).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Section>
    </div>
  )
}
