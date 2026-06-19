import { useMemo, useState } from 'react'
import Card from '../components/Card'
import Section from '../components/Section'
import Sparkline from '../components/Sparkline'
import { useAppState } from '../state'
import { CHECKING_BUFFER, SAVINGS_BUFFER } from '../calculations'

type GraphMode = 'spending' | 'openbankBalance' | 'openbankPercent'

export default function ForecastPage() {
  const {
    accounts,
    payPeriods,
    selectedPayPeriodId,
    getRecurringTotals,
  } = useAppState()

  const [graphMode, setGraphMode] = useState<GraphMode>('spending')

  const rows = useMemo(() => {
    if (payPeriods.length === 0) return [] as Array<{
      id: number
      label: string
      payDate: string
      remainingPool: number
      spendingMoney: number
      extraToOpenbank: number
      openbankPercent: number
      openbankBalanceEnd: number
    }>

    const bal = (id: string) => accounts.find((a) => a.id === id)?.balance ?? 0
    let prevEnd: Record<string, number> | null = null

    return payPeriods.map((period, idx) => {
      const startSavings = period.startingBalances?.savings ?? (prevEnd?.savings ?? bal('savings'))
      const startChecking = period.startingBalances?.checking ?? (prevEnd?.checking ?? bal('checking'))
      const startRent = period.startingBalances?.rentFund ?? (prevEnd?.rentFund ?? bal('rentFund'))
      const startCashApp = period.startingBalances?.cashApp ?? (prevEnd?.cashApp ?? bal('cashApp'))
      const startOpenbank = period.startingBalances?.openbank ?? (prevEnd?.openbank ?? bal('openbank'))

      const totals = getRecurringTotals(idx)
      const cashAppLoad = totals.groceries + totals.bus

      const baseTransferToChecking =
        startSavings +
        period.payAmount -
        period.transfers.rent -
        period.transfers.openbank -
        totals.fromSavings -
        SAVINGS_BUFFER

      const remainingPool =
        startChecking +
        baseTransferToChecking -
        totals.fromChecking -
        cashAppLoad -
        CHECKING_BUFFER

      const maxSpending = remainingPool > 0 ? remainingPool : 0
      const spendingMoney =
        remainingPool > 0
          ? Math.max(0, Math.min(maxSpending, period.spendingMoneyTarget ?? maxSpending))
          : remainingPool
      const extraToOpenbank = remainingPool > 0 ? remainingPool - spendingMoney : 0
      const openbankTransfer = period.transfers.openbank + extraToOpenbank
      const openbankPercent = remainingPool > 0 ? (extraToOpenbank / remainingPool) * 100 : 0

      const end = {
        savings: SAVINGS_BUFFER,
        checking: CHECKING_BUFFER + Math.max(0, spendingMoney),
        rentFund: startRent + period.transfers.rent,
        cashApp: startCashApp + cashAppLoad - totals.groceries - totals.bus,
        openbank: startOpenbank + openbankTransfer,
      }
      prevEnd = end

      return {
        id: period.id,
        label: period.label,
        payDate: period.payDate,
        remainingPool,
        spendingMoney: Math.max(0, spendingMoney),
        extraToOpenbank: Math.max(0, extraToOpenbank),
        openbankPercent,
        openbankBalanceEnd: end.openbank,
      }
    })
  }, [accounts, getRecurringTotals, payPeriods])

  const selectedRow = rows.find((row) => row.id === selectedPayPeriodId) ?? rows[0]

  const positiveRows = rows.filter((row) => row.remainingPool > 0)
  const avgPool = positiveRows.length > 0 ? positiveRows.reduce((sum, row) => sum + row.remainingPool, 0) / positiveRows.length : 0
  const lastPct = positiveRows.length > 0 ? positiveRows[positiveRows.length - 1]?.openbankPercent ?? 0 : 0
  const estNextOpenbankExtra = (avgPool * lastPct) / 100
  const estAnnualOpenbankExtra = estNextOpenbankExtra * 26

  const labels = rows.map((row) => row.label)
  const spendingSeries = rows.map((row) => row.spendingMoney)
  const openbankBalanceSeries = rows.map((row) => row.openbankBalanceEnd)
  const openbankPctSeries = rows.map((row) => Number(row.openbankPercent.toFixed(1)))

  const graphData =
    graphMode === 'spending'
      ? spendingSeries
      : graphMode === 'openbankBalance'
        ? openbankBalanceSeries
        : openbankPctSeries

  const graphTitle =
    graphMode === 'spending'
      ? 'Spending money by pay period'
      : graphMode === 'openbankBalance'
        ? 'OpenBank balance trend'
        : 'OpenBank share of pool (%)'

  if (payPeriods.length === 0) {
    return (
      <div className="space-y-6">
        <Section title="Forecast" description="No pay periods yet.">
          <Card title="No forecast data">
            <p className="text-sm text-slate-600">Add at least one pay period to see forecast graphs.</p>
          </Card>
        </Section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Section title="Forecast" description="Visualize spending and OpenBank growth trends.">
        <Card title="Trend graphs" subtitle="Pick a graph view.">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Based on your pay-period settings and saved pool split.</p>
            <select
              value={graphMode}
              onChange={(e) => setGraphMode(e.target.value as GraphMode)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
            >
              <option value="spending">Spending money</option>
              <option value="openbankBalance">OpenBank balance</option>
              <option value="openbankPercent">OpenBank share %</option>
            </select>
          </div>
          <p className="mb-2 text-sm font-semibold text-slate-900">{graphTitle}</p>
          <div className="h-24 w-full">
            <Sparkline data={graphData} labels={labels} color={graphMode === 'openbankPercent' ? '#0f766e' : '#0f172a'} height={76} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Current period</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedRow?.label ?? 'n/a'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Spending now</p>
              <p className="mt-1 font-semibold text-slate-900">${(selectedRow?.spendingMoney ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">OpenBank now</p>
              <p className="mt-1 font-semibold text-slate-900">${(selectedRow?.openbankBalanceEnd ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Current split" subtitle="Saved allocation on selected pay period.">
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between"><span>Pool</span><span className="font-semibold text-slate-900">${(selectedRow?.remainingPool ?? 0).toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span>Spending money</span><span className="font-semibold text-slate-900">${(selectedRow?.spendingMoney ?? 0).toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span>Extra to OpenBank</span><span className="font-semibold text-slate-900">${(selectedRow?.extraToOpenbank ?? 0).toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span>OpenBank share</span><span className="font-semibold text-slate-900">{(selectedRow?.openbankPercent ?? 0).toFixed(1)}%</span></div>
            </div>
          </Card>

          <Card title="If trend continues" subtitle="Uses your latest OpenBank share % over average pool size.">
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between"><span>Latest OpenBank share</span><span className="font-semibold text-slate-900">{lastPct.toFixed(1)}%</span></div>
              <div className="flex items-center justify-between"><span>Average pool</span><span className="font-semibold text-slate-900">${avgPool.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex items-center justify-between"><span>Estimated extra OpenBank next paycheck</span><span className="font-semibold text-slate-900">${estNextOpenbankExtra.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex items-center justify-between"><span>Estimated extra OpenBank yearly (26 paychecks)</span><span className="font-semibold text-slate-900">${estAnnualOpenbankExtra.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}
