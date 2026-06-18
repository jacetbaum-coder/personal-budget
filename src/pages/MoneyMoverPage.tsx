import { useMemo } from 'react'
import Card from '../components/Card'
import InfoRow from '../components/InfoRow'
import Section from '../components/Section'
import { calculateCashAppTransfer } from '../calculations'
import { useAppState } from '../state'

export default function MoneyMoverPage() {
  const {
    accounts,
    extraMoney,
    selectedMoverDestination,
    setExtraMoney,
    setSelectedMoverDestination
  } = useAppState()

  const destinationAccount = useMemo(
    () => accounts.find((account) => account.id === selectedMoverDestination) ?? accounts[0],
    [accounts, selectedMoverDestination]
  )

  const projectedBalance = destinationAccount.balance + extraMoney
  const difference = extraMoney

  return (
    <div className="space-y-6">
      <Section title="Money Mover" description="Plan the impact of moving extra money before you commit.">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card title="Move extra money" subtitle="Choose an amount and destination to see the effect.">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Extra money amount</span>
                  <input
                    type="number"
                    value={extraMoney}
                    onChange={(event) => setExtraMoney(Number(event.target.value))}
                    className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-lg font-semibold text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Destination account</span>
                  <select
                    value={selectedMoverDestination}
                    onChange={(event) => setSelectedMoverDestination(event.target.value as typeof selectedMoverDestination)}
                    className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm shadow-slate-200/40">
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Impact preview</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/40">
                    <p className="text-sm text-slate-500">Current balance</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">${destinationAccount.balance.toLocaleString()}</p>
                  </div>
                  <div className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/40">
                    <p className="text-sm text-slate-500">Projected balance</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">${projectedBalance.toLocaleString()}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-950/15">
                    <p className="text-sm text-slate-300">Difference</p>
                    <p className="mt-3 text-3xl font-semibold">+${difference.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Visual comparison" subtitle="Before / after destination balance.">
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-50 p-6 shadow-sm shadow-slate-200/40">
                <div className="flex items-end gap-4">
                  <div className="h-24 w-full rounded-3xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Before</p>
                    <p className="mt-4 text-3xl font-semibold text-slate-900">${destinationAccount.balance.toLocaleString()}</p>
                  </div>
                  <div className="h-32 w-full rounded-3xl bg-slate-900 p-4 text-white">
                    <p className="text-sm text-slate-300">After</p>
                    <p className="mt-4 text-3xl font-semibold">${projectedBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-6 shadow-sm shadow-slate-200/40">
                <h3 className="text-base font-semibold text-slate-900">Forecast effect</h3>
                <p className="mt-3 text-sm text-slate-600">
                  Moving extra money to {destinationAccount.name} increases your projected balance and gives you a clearer view of where your spare cash is being positioned.
                </p>
                <div className="mt-4 space-y-4">
                  <InfoRow label="Available spending outcome" value={`$${(destinationAccount.balance + availableSpendingAdjustment(destinationAccount.balance, extraMoney)).toLocaleString()}`} />
                  <InfoRow label="Spend buffer impact" value={`$${Math.round((safetyBufferAdjustment(destinationAccount.balance, extraMoney) ?? 0)).toLocaleString()}`} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}

function availableSpendingAdjustment(balance: number, extra: number) {
  return Math.round((balance + extra) * 0.18)
}

function safetyBufferAdjustment(_balance: number, _extra: number) {
  return 0 // buffers are now fixed; moving money between accounts doesn't change them
}
