import { useMemo } from 'react'
import Card from '../components/Card'
import InfoRow from '../components/InfoRow'
import Section from '../components/Section'
import TimelineButton from '../components/TimelineButton'
import { useAppState } from '../state'
import {
  calculateAvailableSpending,
  calculateCashAppTransfer,
  calculateProjectedLeftover,
  calculateSafetyBuffer
} from '../calculations'

export default function ForecastPage() {
  const {
    accounts,
    payPeriods,
    forecastPoints,
    selectedForecastPointId,
    setSelectedForecastPointId,
    getRecurringTotals,
    getProjectedLeftover,
    getAvailableSpending,
    getSafetyBuffer
  } = useAppState()

  const selectedPoint = useMemo(
    () => forecastPoints.find((point) => point.id === selectedForecastPointId) ?? forecastPoints[0],
    [forecastPoints, selectedForecastPointId]
  )

  const selectedPeriod = useMemo(
    () => payPeriods.find((period) => period.id === selectedPoint.payPeriodId) ?? payPeriods[0],
    [payPeriods, selectedPoint.payPeriodId]
  )

  const periodIndex = useMemo(
    () => payPeriods.findIndex((period) => period.id === selectedPeriod.id),
    [payPeriods, selectedPeriod.id]
  )

  const recurringTotals = useMemo(() => getRecurringTotals(periodIndex), [getRecurringTotals, periodIndex])

  const projectedLeftover = getProjectedLeftover(selectedPeriod, recurringTotals)
  const cashAppTransfer = calculateCashAppTransfer(recurringTotals.groceries, recurringTotals.bus)
  const safetyBuffer = getSafetyBuffer(projectedLeftover)
  const availableSpending = getAvailableSpending(projectedLeftover)

  const adjustedBalances = useMemo(
    () =>
      accounts.map((account) => ({
        ...account,
        projectedBalance: account.balance + (selectedPoint.balanceAdjustments[account.id] ?? 0)
      })),
    [accounts, selectedPoint.balanceAdjustments]
  )

  return (
    <div className="space-y-6">
      <Section title="Forecast" description="What will my finances look like on this future date?">
        <Card title="Future date selector" subtitle="Pick a date to preview projected balances.">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            {forecastPoints.map((point) => (
              <TimelineButton
                key={point.id}
                label={point.dateLabel}
                active={point.id === selectedForecastPointId}
                onClick={() => setSelectedForecastPointId(point.id)}
              />
            ))}
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card title="Projected balances" subtitle={`Forecast for ${selectedPoint.dateLabel}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {adjustedBalances.map((account) => (
                <InfoRow
                  key={account.id}
                  label={account.name}
                  value={`$${account.projectedBalance.toLocaleString()}`}
                />
              ))}
            </div>
          </Card>

          <Card title="Forecast summary" subtitle="Projected account position and spending headroom.">
            <div className="space-y-4">
              <InfoRow label="Pay period" value={selectedPeriod.label} />
              <InfoRow label="Projected Leftover" value={`$${projectedLeftover.toLocaleString()}`} />
              <InfoRow
                label="Safety Buffer"
                value={`$${safetyBuffer.toLocaleString()}`}
                note={`${Math.round((safetyBuffer / Math.max(projectedLeftover, 1)) * 100)}% of leftover`}
              />
              <InfoRow label="Available Spending" value={`$${availableSpending.toLocaleString()}`} />
              <InfoRow label="CashApp transfer" value={`$${cashAppTransfer.toLocaleString()}`} note="Estimated groceries + bus" />
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}
