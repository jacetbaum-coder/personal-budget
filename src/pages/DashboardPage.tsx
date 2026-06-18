import Card from '../components/Card'
import InfoRow from '../components/InfoRow'
import Section from '../components/Section'
import { useAppState } from '../state'

export default function DashboardPage() {
  const {
    accounts,
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

  return (
    <div className="space-y-6">
      <Section title="Dashboard" description="A calmer dashboard with just the most useful information for your next paycheck.">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="xl:col-span-2">
            <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">{dashboardHeading}</h2>
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
          <Card title="Available to Spend" subtitle="A simplified view of how much is left after pay period commitments." className="xl:col-span-1">
            <div className="rounded-[2rem] bg-slate-100 p-8 text-slate-900 shadow-sm shadow-slate-200/40">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Available Spending</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight">${availableSpending.toLocaleString()}</p>
              <p className="mt-2 text-sm text-slate-600">This is the amount you should feel comfortable spending before your next paycheck arrives.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/40">
                  <p className="text-sm text-slate-500">Days until next paycheck</p>
                  <p className="mt-3 text-2xl font-semibold">5</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/40">
                  <p className="text-sm text-slate-500">Reserved for recurring commitments</p>
                  <p className="mt-3 text-2xl font-semibold">${safetyBuffer.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card title="Current Snapshot" subtitle="Live balance overview for primary accounts.">
              <div className="grid gap-4 sm:grid-cols-2">
                {accounts.map((account) => (
                  <InfoRow key={account.id} label={account.name} value={`$${account.balance.toLocaleString()}`} />
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
