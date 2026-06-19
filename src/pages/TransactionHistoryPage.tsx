import Card from '../components/Card'
import Section from '../components/Section'
import { useAppState } from '../state'
import { transactionCategoryLabels, transactionTypeLabels } from '../models'

export default function TransactionHistoryPage() {
  const { transactions } = useAppState()

  // Find the split between historical (pre-Apr 2026) and current data
  const historicalCutoff = new Date('2026-04-15').getTime()
  const historicalTxns = transactions.filter(t => new Date(t.createdAt).getTime() < historicalCutoff)
  const currentTxns = transactions.filter(t => new Date(t.createdAt).getTime() >= historicalCutoff)
  const sortedTxns = [...currentTxns.reverse(), ...historicalTxns.reverse()]
  const showDivider = historicalTxns.length > 0 && currentTxns.length > 0

  return (
    <div className="space-y-6">
      <Section title="Transaction History" description="A conversational record of your recent financial actions.">
        <Card title="Recent transactions" subtitle="Sorted by the assistant's recorded updates.">
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">No transactions have been recorded yet. Use the inbox to add one.</p>
            ) : (
              sortedTxns.map((transaction, idx) => {
                const isBeforeDivider = idx > 0 && historicalTxns.length > 0 && currentTxns.length > 0 && idx === currentTxns.length
                return (
                  <div key={transaction.id}>
                    {isBeforeDivider && (
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex-1 border-t border-slate-300" />
                        <p className="text-xs uppercase tracking-widest text-slate-400">Historical Data (Oct 2025 – Apr 2026)</p>
                        <div className="flex-1 border-t border-slate-300" />
                      </div>
                    )}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm shadow-slate-200/40">
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
                          <p className="mt-1 text-sm text-slate-700">{transaction.customCategoryLabel ?? transactionCategoryLabels[transaction.category]}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Transfer</p>
                          <p className="mt-1 text-sm text-slate-700">{transaction.source && transaction.destination ? `${transaction.source} → ${transaction.destination}` : '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </Section>
    </div>
  )
}
