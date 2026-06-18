import { useMemo, useState } from 'react'
import Card from '../components/Card'
import InfoRow from '../components/InfoRow'
import Section from '../components/Section'
import {
  calculateAvailableSpending,
  calculateProjectedLeftover,
  calculateSafetyBuffer
} from '../calculations'
import type { PayPeriod } from '../models'
import { isRecurringExpenseDue } from '../recurring'
import { useAppState } from '../state'

export default function PayPeriodsPage() {
  const {
    payPeriods,
    setPayPeriods,
    recurringExpenses,
    selectedPayPeriodId,
    setSelectedPayPeriodId,
    getRecurringTotals,
  } = useAppState()

  const [editMode, setEditMode] = useState(false)
  const [draftPeriods, setDraftPeriods] = useState<PayPeriod[]>(payPeriods)

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

  const updateDraft = (id: number, patch: Partial<PayPeriod>) =>
    setDraftPeriods((curr) => curr.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const updateDraftTransfer = (id: number, key: 'rent' | 'openbank', value: number) =>
    setDraftPeriods((curr) =>
      curr.map((p) => (p.id === id ? { ...p, transfers: { ...p.transfers, [key]: value } } : p))
    )

  const startEdit = () => {
    setDraftPeriods(payPeriods)
    setEditMode(true)
  }

  const cancelEdit = () => {
    setDraftPeriods(payPeriods)
    setEditMode(false)
  }

  const saveChanges = () => {
    setPayPeriods(draftPeriods)
    setEditMode(false)
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none'

  return (
    <div className="space-y-6">
      <Section title="Pay Periods" description="What does my money look like across all upcoming periods?">
        {/* Period selector grid — wraps for 7 items */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {payPeriods.map((period) => {
            const idx = payPeriods.indexOf(period)
            const periodTotals = getRecurringTotals(idx)
            const periodLeftover = calculateProjectedLeftover(
              period.payAmount,
              period.transfers.rent,
              period.transfers.openbank,
              periodTotals.fromSavings
            )
            const periodAvailable = calculateAvailableSpending(periodLeftover, calculateSafetyBuffer(periodLeftover))
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
                <p className={`text-xs font-semibold uppercase tracking-wider ${active ? 'text-slate-400' : 'text-slate-400'}`}>{period.label}</p>
                <p className="mt-2 text-xl font-semibold">${period.payAmount.toLocaleString()}</p>
                <p className={`mt-2 text-xs ${active ? 'text-slate-400' : 'text-slate-400'}`}>${periodAvailable.toLocaleString()} avail.</p>
              </button>
            )
          })}
        </div>

        {/* Detail panel for selected period */}
        <div className="grid gap-6 lg:grid-cols-2">
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
              <div className="my-1 border-t border-slate-100" />
              <InfoRow label="Savings expenses due" value={`$${recurringTotals.fromSavings.toLocaleString()}`} />
              <InfoRow label="Checkings expenses" value={`$${recurringTotals.fromChecking.toLocaleString()}`} />
              <InfoRow label="CashApp load" value={`$${recurringTotals.fromCashApp.toLocaleString()}`} />
              <InfoRow label="Projected leftover" value={`$${projectedLeftover.toLocaleString()}`} />
              <InfoRow label="Safety buffer" value={`$${safetyBuffer.toLocaleString()}`} note={`${Math.round((safetyBuffer / Math.max(projectedLeftover, 1)) * 100)}%`} />
              <InfoRow label="Available spending" value={`$${availableSpending.toLocaleString()}`} />
            </div>
          </Card>

          <Card title="Expenses due this period" subtitle="All recurring items that fall on this pay date.">
            <div className="space-y-2">
              {recurringExpenses
                .filter((e) => isRecurringExpenseDue(e, periodIndex))
                .sort((a, b) => b.amount - a.amount)
                .map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{expense.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{expense.sourceAccount} · {expense.frequency}</p>
                    </div>
                    <p className="font-semibold text-slate-900">${expense.amount.toLocaleString()}</p>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}
