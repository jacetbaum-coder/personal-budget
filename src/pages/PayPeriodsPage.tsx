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
import { useAppState } from '../state'

export default function PayPeriodsPage() {
  const {
    payPeriods,
    setPayPeriods,
    recurringExpenses,
    selectedPayPeriodId,
    setSelectedPayPeriodId,
    getRecurringTotals,
    getUpcomingRecurring
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
  const totalRecurringExpenses = recurringTotals.fromSavings + recurringTotals.fromChecking + recurringTotals.fromCashApp

  const projectedLeftover = calculateProjectedLeftover(
    selectedPeriod.payAmount,
    selectedPeriod.transfers.rent,
    selectedPeriod.transfers.openbank,
    recurringTotals.fromSavings
  )
  const safetyBuffer = calculateSafetyBuffer(projectedLeftover)
  const availableSpending = calculateAvailableSpending(projectedLeftover, safetyBuffer)
  const upcomingOccurrences = getUpcomingRecurring(periodIndex, 6)

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
      <Section title="Pay Periods" description="Select a period to view details, or edit pay amounts and transfers.">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
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
                        Recurring: <span className="font-semibold">${(periodTotals.fromSavings + periodTotals.fromChecking + periodTotals.fromCashApp).toLocaleString()}</span>
                      </p>
                      <p>
                        Available: <span className="font-semibold">${periodAvailable.toLocaleString()}</span>
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <Card
              title="Selected pay period details"
              subtitle={`${selectedPeriod.label} • ${selectedPeriod.payDate}`}
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
              <div className="space-y-4">
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
                <InfoRow label="Recurring expense total" value={`$${totalRecurringExpenses.toLocaleString()}`} />
                <InfoRow label="Projected Leftover" value={`$${projectedLeftover.toLocaleString()}`} />
                <InfoRow label="Safety Buffer" value={`$${safetyBuffer.toLocaleString()}`} note={`${Math.round((safetyBuffer / Math.max(projectedLeftover, 1)) * 100)}%`} />
                <InfoRow label="Available Spending" value={`$${availableSpending.toLocaleString()}`} />
              </div>
            </Card>

            <Card title="Upcoming occurrences" subtitle="Next recurring bills by pay period.">
              <div className="space-y-3">
                {upcomingOccurrences.map((item) => (
                  <div key={`${item.expense.id}-${item.periodIndex}`} className="rounded-3xl bg-slate-50 p-4 shadow-sm shadow-slate-200/40">
                    <p className="font-semibold text-slate-900">{item.expense.name}</p>
                    <p className="text-sm text-slate-500">${item.expense.amount.toLocaleString()} • {item.expense.frequency}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                      Pay period {(item.periodIndex + 1).toLocaleString()}
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
