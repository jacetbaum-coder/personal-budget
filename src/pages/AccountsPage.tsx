import { useMemo, useState } from 'react'
import Card from '../components/Card'
import Section from '../components/Section'
import { CHECKING_BUFFER, SAVINGS_BUFFER } from '../calculations'
import { useAppState } from '../state'
import type { Account, AccountId, TransactionCategory, TransactionRecord } from '../models'
import { accountColorOptions, transactionCategoryLabels } from '../models'
import { parseBankPurchaseInput, type ParsedBankPurchase } from '../services/bankPurchaseParser'

const blankAccount = (): Omit<Account, 'id'> => ({ name: '', balance: 0, color: 'slate' })
const CATEGORY_OPTIONS = Object.keys(transactionCategoryLabels) as TransactionCategory[]

type ReviewedPurchase = {
  purchase: ParsedBankPurchase
  selectedCategory: TransactionCategory | '__new__'
  customLabel: string
}

function getColorClasses(color?: string) {
  return accountColorOptions.find((c) => c.value === color) ?? accountColorOptions[accountColorOptions.length - 1]
}

export default function AccountsPage() {
  const { accounts, setAccounts, payPeriods, selectedPayPeriodId, getRecurringTotals, transactions, setTransactions } = useAppState()
  const [editMode, setEditMode] = useState(false)
  const [draftAccounts, setDraftAccounts] = useState<Account[]>(accounts)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState<Omit<Account, 'id'>>(blankAccount())
  const [importTextByAccount, setImportTextByAccount] = useState<Record<string, string>>({})
  const [reviewByAccount, setReviewByAccount] = useState<Record<string, ReviewedPurchase[]>>({})

  const selectedPeriod = useMemo(
    () => payPeriods.find((period) => period.id === selectedPayPeriodId) ?? payPeriods[0],
    [payPeriods, selectedPayPeriodId]
  )

  const periodIndex = useMemo(
    () => payPeriods.findIndex((period) => period.id === selectedPayPeriodId),
    [payPeriods, selectedPayPeriodId]
  )

  const projectedBalances = useMemo(() => {
    if (!selectedPeriod || periodIndex < 0) return new Map<string, number>()

    const bal = (id: string) => accounts.find((a) => a.id === id)?.balance ?? 0
    const totals = getRecurringTotals(periodIndex)
    const cashAppLoad = totals.groceries + totals.bus

    const startSavings = selectedPeriod.startingBalances?.savings ?? bal('savings')
    const startChecking = selectedPeriod.startingBalances?.checking ?? bal('checking')
    const startRent = selectedPeriod.startingBalances?.rentFund ?? bal('rentFund')
    const startCashApp = selectedPeriod.startingBalances?.cashApp ?? bal('cashApp')
    const startOpenbank = selectedPeriod.startingBalances?.openbank ?? bal('openbank')

    const baseTransferToChecking =
      startSavings +
      selectedPeriod.payAmount -
      selectedPeriod.transfers.rent -
      selectedPeriod.transfers.openbank -
      totals.fromSavings -
      SAVINGS_BUFFER

    const remainingPool =
      startChecking +
      baseTransferToChecking -
      totals.fromChecking -
      cashAppLoad -
      CHECKING_BUFFER

    const maxSpendingForPeriod = remainingPool > 0 ? remainingPool : 0
    const spendingMoneyTarget =
      remainingPool > 0
        ? Math.max(0, Math.min(maxSpendingForPeriod, selectedPeriod.spendingMoneyTarget ?? maxSpendingForPeriod))
        : remainingPool
    const extraToOpenbank = remainingPool > 0 ? remainingPool - spendingMoneyTarget : 0
    const totalOpenbankTransfer = selectedPeriod.transfers.openbank + extraToOpenbank

    const result = new Map<string, number>()
    result.set('savings', SAVINGS_BUFFER)
    result.set('checking', CHECKING_BUFFER + Math.max(0, spendingMoneyTarget))
    result.set('rentFund', startRent + selectedPeriod.transfers.rent)
    result.set('cashApp', startCashApp + cashAppLoad - totals.groceries - totals.bus)
    result.set('openbank', startOpenbank + totalOpenbankTransfer)
    return result
  }, [accounts, getRecurringTotals, periodIndex, selectedPeriod])

  const displayedAccounts = editMode ? draftAccounts : accounts
  const displayedTotal = displayedAccounts.reduce(
    (sum, account) => sum + (editMode ? account.balance : (projectedBalances.get(account.id) ?? account.balance)),
    0
  )

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none'

  const startEdit = () => {
    setDraftAccounts(accounts)
    setShowAddAccount(false)
    setEditMode(true)
  }

  const cancelEdit = () => {
    setShowAddAccount(false)
    setEditMode(false)
  }

  const saveChanges = () => {
    setAccounts(draftAccounts)
    setShowAddAccount(false)
    setEditMode(false)
  }

  const updateDraftAccount = (id: AccountId, patch: Partial<Account>) =>
    setDraftAccounts((curr) => curr.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const removeDraftAccount = (id: AccountId) =>
    setDraftAccounts((curr) => curr.filter((a) => a.id !== id))

  const commitAddAccount = () => {
    if (!newAccount.name.trim()) return
    const id = newAccount.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setDraftAccounts((curr) => [...curr, { id, ...newAccount }])
    setNewAccount(blankAccount())
    setShowAddAccount(false)
  }

  const analyzeAccountText = (accountId: string) => {
    const input = importTextByAccount[accountId] ?? ''
    const parsed = parseBankPurchaseInput(input)
    const reviewed: ReviewedPurchase[] = parsed.map((purchase) => ({
      purchase,
      selectedCategory: purchase.suggestedCategory,
      customLabel: '',
    }))
    setReviewByAccount((prev) => ({ ...prev, [accountId]: reviewed }))
  }

  const updateReviewedPurchase = (
    accountId: string,
    purchaseId: string,
    patch: Partial<Omit<ReviewedPurchase, 'purchase'>>
  ) => {
    setReviewByAccount((prev) => ({
      ...prev,
      [accountId]: (prev[accountId] ?? []).map((item) =>
        item.purchase.id === purchaseId
          ? { ...item, ...patch }
          : item
      ),
    }))
  }

  const unresolvedCount = (accountId: string) =>
    (reviewByAccount[accountId] ?? []).filter((item) => item.selectedCategory === '__new__' && !item.customLabel.trim()).length

  const saveReviewedPurchases = (accountId: string) => {
    const items = reviewByAccount[accountId] ?? []
    if (items.length === 0) return
    if (unresolvedCount(accountId) > 0) return

    const accountName = accounts.find((account) => account.id === accountId)?.name ?? accountId
    const now = new Date().toISOString()

    const newRecords: TransactionRecord[] = items.map((item) => {
      const normalizedCategory = item.selectedCategory === '__new__' ? 'other' : item.selectedCategory
      const customCategoryLabel = item.selectedCategory === '__new__' ? item.customLabel.trim() : undefined
      const dateHint = item.purchase.dateText ? ` (${item.purchase.dateText})` : ''

      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        description: `${item.purchase.merchant}${dateHint}`,
        amount: item.purchase.amount,
        source: accountId,
        type: 'expense',
        category: normalizedCategory,
        customCategoryLabel,
        impact: 'reduced',
      }
    })

    setTransactions([...transactions, ...newRecords])
    setReviewByAccount((prev) => ({ ...prev, [accountId]: [] }))
    setImportTextByAccount((prev) => ({ ...prev, [accountId]: '' }))
  }

  return (
    <div className={`space-y-5 transition-colors ${editMode ? 'rounded-[1.75rem] bg-slate-50/50 p-5' : ''}`}>
      <div className={`rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/50 ${editMode ? 'ring-2 ring-slate-300/70' : ''}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Accounts</h1>
            <p className="text-sm text-slate-500">
              {editMode ? 'Edit mode active - save when finished.' : `Projected balances for ${selectedPeriod?.label ?? 'selected period'}.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {editMode ? (
              <>
                <button type="button" onClick={cancelEdit}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="button" onClick={saveChanges}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Save changes
                </button>
              </>
            ) : (
              <button type="button" onClick={startEdit}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Edit accounts
              </button>
            )}
          </div>
        </div>
      </div>

      <Section title="Accounts" description="Manage account balances.">
        <Card
          title="Accounts"
          subtitle={editMode ? 'Current balances' : `Projected after ${selectedPeriod?.label ?? 'selected period'}`}
          action={
            editMode && !showAddAccount ? (
              <button onClick={() => setShowAddAccount(true)}
                className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800">
                + Add account
              </button>
            ) : undefined
          }
        >
          {showAddAccount && (
            <div className="mb-4 rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">New account</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Name</label>
                  <input className={inputCls} placeholder="e.g. Chase Savings" value={newAccount.name}
                    onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Balance ($)</label>
                  <input type="number" className={inputCls} value={newAccount.balance}
                    onChange={(e) => setNewAccount((p) => ({ ...p, balance: Number(e.target.value) }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">Color</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {accountColorOptions.map((opt) => (
                      <button key={opt.value} type="button" title={opt.label}
                        onClick={() => setNewAccount((p) => ({ ...p, color: opt.value }))}
                        className={`h-6 w-6 rounded-full ${opt.dot} transition ${newAccount.color === opt.value ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-60 hover:opacity-100'}`} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={commitAddAccount}
                  className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                  Add
                </button>
                <button onClick={() => setShowAddAccount(false)}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {displayedAccounts.map((account) => (
              <div key={account.id} className="rounded-2xl bg-slate-50 p-3">
                {editMode ? (
                  <div className="space-y-2">
                    <input className={inputCls} value={account.name} placeholder="Account name"
                      onChange={(e) => updateDraftAccount(account.id, { name: e.target.value })} />
                    <input type="number" className={inputCls} value={account.balance}
                      onChange={(e) => updateDraftAccount(account.id, { balance: Number(e.target.value) })} />
                    <div>
                      <p className="mb-1 text-xs text-slate-400">Color</p>
                      <div className="flex flex-wrap gap-1.5">
                        {accountColorOptions.map((opt) => (
                          <button key={opt.value} type="button" title={opt.label}
                            onClick={() => updateDraftAccount(account.id, { color: opt.value })}
                            className={`h-5 w-5 rounded-full ${opt.dot} transition ${account.color === opt.value ? 'ring-2 ring-offset-1 ring-slate-900 scale-110' : 'opacity-50 hover:opacity-100'}`} />
                        ))}
                      </div>
                    </div>
                    <button onClick={() => removeDraftAccount(account.id)}
                      className="w-full rounded-xl border border-red-200 bg-red-50 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      {account.color && (
                        <span className={`h-3 w-3 rounded-full ${getColorClasses(account.color).dot}`} />
                      )}
                      <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">${(projectedBalances.get(account.id) ?? account.balance).toLocaleString()}</p>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-3xl bg-slate-950 p-4 text-white">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Total balance</p>
            <p className="mt-2 text-3xl font-semibold">${displayedTotal.toLocaleString()}</p>
          </div>
        </Card>

        <Card
          title="Purchase import by account"
          subtitle="Paste raw bank lines for each account. We auto-categorize and let you review unknowns."
        >
          <div className="space-y-4">
            {accounts.map((account) => {
              const reviewed = reviewByAccount[account.id] ?? []
              const unresolved = unresolvedCount(account.id)
              return (
                <div key={account.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className={`h-2.5 w-2.5 rounded-full ${getColorClasses(account.color).dot}`} />
                      {account.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => analyzeAccountText(account.id)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Analyze
                    </button>
                  </div>

                  <textarea
                    rows={5}
                    value={importTextByAccount[account.id] ?? ''}
                    onChange={(e) => setImportTextByAccount((prev) => ({ ...prev, [account.id]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    placeholder={`Paste ${account.name} transactions here...`}
                  />

                  {reviewed.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {reviewed.map((item) => {
                        const needsCategoryPick = item.selectedCategory === 'other' && item.purchase.needsReview
                        return (
                          <div key={item.purchase.id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{item.purchase.merchant}</p>
                                <p className="text-xs text-slate-500">${item.purchase.amount.toFixed(2)}{item.purchase.dateText ? ` · ${item.purchase.dateText}` : ''}</p>
                              </div>
                              <div className="w-full sm:w-64">
                                <select
                                  value={item.selectedCategory}
                                  onChange={(e) => updateReviewedPurchase(account.id, item.purchase.id, { selectedCategory: e.target.value as TransactionCategory | '__new__' })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                                >
                                  {CATEGORY_OPTIONS.map((cat) => (
                                    <option key={cat} value={cat}>{transactionCategoryLabels[cat]}</option>
                                  ))}
                                  <option value="__new__">Add new label...</option>
                                </select>
                              </div>
                            </div>
                            {(item.selectedCategory === '__new__' || needsCategoryPick) && (
                              <div className="mt-2">
                                <input
                                  value={item.customLabel}
                                  onChange={(e) => updateReviewedPurchase(account.id, item.purchase.id, { customLabel: e.target.value })}
                                  placeholder="Custom category label"
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <p className="text-xs text-slate-500">
                          {unresolved > 0 ? `${unresolved} item(s) still need a category label.` : 'All items categorized.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => saveReviewedPurchases(account.id)}
                          disabled={unresolved > 0}
                          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-800"
                        >
                          Save to history
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </Section>
    </div>
  )
}
