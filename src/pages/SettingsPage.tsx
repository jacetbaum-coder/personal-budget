import { ChangeEvent } from 'react'
import Card from '../components/Card'
import Section from '../components/Section'
import { useAppState } from '../state'

export default function SettingsPage() {
  const {
    defaultPayPeriodLabel,
    currency,
    forecastHorizon,
    notifications,
    setDefaultPayPeriodLabel,
    setCurrency,
    setForecastHorizon,
    setNotifications
  } = useAppState()

  return (
    <div className="space-y-6">
      <Section title="Settings" description="Configure your forecasting preferences and allocation rules.">
        <Card title="Preferences">
          <div className="space-y-4 text-sm text-slate-600">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Default pay period</span>
              <input
                type="text"
                value={defaultPayPeriodLabel}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setDefaultPayPeriodLabel(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Currency</span>
              <input
                type="text"
                value={currency}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setCurrency(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Forecast horizon (days)</span>
              <input
                type="number"
                value={forecastHorizon}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setForecastHorizon(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
              />
            </label>
          </div>
        </Card>
      </Section>

      <Section title="System settings">
        <Card title="Notifications" subtitle="Receive alerts for upcoming pay periods and low buffers.">
          <div className="space-y-4 text-sm text-slate-600">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNotifications({ ...notifications, email: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              Email notifications
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNotifications({ ...notifications, push: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              Push notifications
            </label>
          </div>
        </Card>
      </Section>
    </div>
  )
}
