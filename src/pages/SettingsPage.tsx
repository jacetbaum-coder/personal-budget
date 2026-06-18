import Card from '../components/Card'
import Section from '../components/Section'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Section title="Settings" description="Configure your forecasting preferences and allocation rules.">
        <Card title="Preferences">
          <div className="space-y-3 text-sm text-slate-600">
            <p>Default pay period: Biweekly</p>
            <p>Currency: USD</p>
            <p>Forecast horizon: 30 days</p>
          </div>
        </Card>
      </Section>

      <Section title="System settings">
        <Card title="Notifications" subtitle="Receive alerts for upcoming pay periods and low buffers.">
          <div className="space-y-3 text-sm text-slate-600">
            <p>Email: Off</p>
            <p>Push notifications: On</p>
          </div>
        </Card>
      </Section>
    </div>
  )
}
