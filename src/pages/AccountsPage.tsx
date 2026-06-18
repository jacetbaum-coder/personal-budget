import Card from '../components/Card'
import Section from '../components/Section'
import { useAppState } from '../state'

export default function AccountsPage() {
  const { accounts } = useAppState()

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  return (
    <div className="space-y-6">
      <Section title="Accounts" description="Track balances and account types for your forecasting model.">
        <Card title="Account summary" subtitle="All balances and liquidity.">
          <div className="space-y-4 text-sm text-slate-600">
            <div className="grid gap-3 sm:grid-cols-3">
              {accounts.map((account) => (
                <div key={account.id} className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                  <p className="mt-2 text-2xl font-semibold">${account.balance.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="rounded-3xl bg-slate-950 p-4 text-white">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Total balance</p>
              <p className="mt-2 text-3xl font-semibold">${totalBalance.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Account details">
        <Card title="Connected accounts">
          <div className="space-y-3 text-sm text-slate-600">
            <p>Checking Account • $3,120</p>
            <p>Savings Account • $5,340</p>
            <p>Emergency Fund • $910</p>
          </div>
        </Card>
      </Section>
    </div>
  )
}
