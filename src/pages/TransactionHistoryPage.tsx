import Card from '../components/Card'
import Section from '../components/Section'
import { useAppState } from '../state'
import { transactionCategoryLabels, transactionTypeLabels } from '../models'

export default function TransactionHistoryPage() {
  const { transactions } = useAppState()

  return (
    <div className="space-y-6">
      <Section title="Transaction History" description="A conversational record of your recent financial actions.">
        <Card title="Recent transactions" subtitle="Sorted by the assistant's recorded updates.">
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">No transactions have been recorded yet. Use the inbox to add one.</p>
            ) : (
              transactions
                .slice()
                .reverse()
                .map((transaction) => (
                  <div key={transaction.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm shadow-slate-200/40">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{transaction.description}</p>
                        <p className="text-sm text-slate-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="text-lg font-semibold text-slate-900">${transaction.amount.toFixed(2)}</p>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Type</p>
                        <p className="mt-1 text-sm text-slate-700">{transactionTypeLabels[transaction.type]}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Category</p>
                        <p className="mt-1 text-sm text-slate-700">{transactionCategoryLabels[transaction.category]}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Transfer</p>
                        <p className="mt-1 text-sm text-slate-700">{transaction.source && transaction.destination ? `${transaction.source} → ${transaction.destination}` : '—'}</p>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </Card>
      </Section>
    </div>
  )
}
