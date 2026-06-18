import { useMemo, useState } from 'react'
import Card from '../components/Card'
import Section from '../components/Section'
import { parseTransactionInput, createTransactionRecord } from '../services/transactionParser'
import { useAppState } from '../state'
import { transactionCategoryLabels, transactionTypeLabels, type RecurringExpense } from '../models'

export default function TransactionInboxPage() {
  const { accounts, transactions, setTransactions, setRecurringExpenses, setSelectedPayPeriodId, setExtraMoney, setSelectedMoverDestination } = useAppState()
  const [input, setInput] = useState('')
  const [draft, setDraft] = useState<ReturnType<typeof parseTransactionInput> | null>(null)

  const confirmation = useMemo(() => {
    if (!draft) return null

    const impact = draft.type === 'expense' ? 'Available Spending reduced by ' : draft.type === 'income' ? 'Available Spending increased by ' : 'No direct spending impact for '
    return {
      title: 'Recorded transaction',
      amount: draft.amount,
      transfer: draft.source && draft.destination ? `${draft.source} → ${draft.destination}` : 'N/A',
      category: transactionCategoryLabels[draft.category],
      impact: `${impact}$${draft.amount}`
    }
  }, [draft])

  const onSubmit = () => {
    if (!input.trim()) return
    const parsed = parseTransactionInput(input)
    const record = createTransactionRecord(parsed)

    setTransactions([...transactions, record])
    if (parsed.type === 'transfer' && parsed.source && parsed.destination) {
      setRecurringExpenses((current: RecurringExpense[]) => current)
      setSelectedMoverDestination(parsed.destination)
    }

    setDraft(parsed)
    setInput('')
  }

  return (
    <div className="space-y-6">
      <Section title="Transaction Inbox" description="Talk to your financial assistant in plain language.">
        <Card title="Tell me what happened" subtitle="Example: I moved $15 from savings to checking.">
          <div className="space-y-4">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={4}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
              placeholder="I bought a bagel and coffee and moved $15 from savings to checking."
            />
            <button
              type="button"
              onClick={onSubmit}
              className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
            >
              Record transaction
            </button>
          </div>
        </Card>

        {confirmation ? (
          <Card title="Confirmation" subtitle="Your financial assistant understood this event.">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Amount</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">${confirmation.amount}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Transfer</p>
                <p className="mt-2 text-slate-900">{confirmation.transfer}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Category</p>
                <p className="mt-2 text-slate-900">{confirmation.category}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Impact</p>
                <p className="mt-2 text-slate-900">{confirmation.impact}</p>
              </div>
            </div>
          </Card>
        ) : null}
      </Section>
    </div>
  )
}
