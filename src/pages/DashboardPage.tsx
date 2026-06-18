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
      <Section title="Dashboard" description="Your financial command center for spending, cashflow, and upcoming paychecks.">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="xl:col-span-2">
            <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-slate-950">{dashboardHeading}</h2>
                  <p className="mt-2 text-sm text-slate-500">Your future cashflow at a glance</p>
                </div>
                <button className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800">
                  {dashboardButtonText}
                </button>
              </div>
            </div>
          </div>
          <Card title="Available to Spend" subtitle="Your safe spending amount before the next paycheck." className="xl:col-span-1">
            <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl shadow-slate-950/20">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Available Spending</p>
              <p className="mt-4 text-5xl font-semibold tracking-tight">${availableSpending.toLocaleString()}</p>
              <p className="mt-2 text-sm text-slate-300">Based on current balances, transfers, and scheduled commitments.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-900/90 p-5">
                  <p className="text-sm text-slate-400">Days until next paycheck</p>
                  <p className="mt-3 text-3xl font-semibold">5</p>
                </div>
                <div className="rounded-3xl bg-slate-900/90 p-5">
                  <p className="text-sm text-slate-400">Reserved for recurring commitments</p>
                  <p className="mt-3 text-3xl font-semibold">${safetyBuffer.toLocaleString()}</p>
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

      <Section title="Forecast Preview" description="A snapshot of the next three pay periods.">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Jun 24 – Jul 7" subtitle="Upcoming pay period">
            <div className="space-y-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">$3,450 expected</p>
              <p>Safe spend: $1,120</p>
              <p>Projected buffer: $680</p>
            </div>
          </Card>
          <Card title="Jul 8 – Jul 21" subtitle="Second pay period">
            <div className="space-y-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">$3,450 expected</p>
              <p>Safe spend: $1,050</p>
              <p>Projected buffer: $610</p>
            </div>
          </Card>
          <Card title="Jul 22 – Aug 4" subtitle="Looking ahead">
            <div className="space-y-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">$3,450 expected</p>
              <p>Safe spend: $1,180</p>
              <p>Projected buffer: $720</p>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}
