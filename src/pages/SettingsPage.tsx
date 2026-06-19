import { ChangeEvent, useMemo, useRef, useState } from 'react'
import Card from '../components/Card'
import Section from '../components/Section'
import { useAppState } from '../state'

const payPeriodOptions = ['Weekly', 'Biweekly', 'Monthly'] as const
const forecastHorizonOptions = [
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 21, label: '3 weeks' },
  { value: 30, label: '1 month' },
  { value: 60, label: '2 months' },
  { value: 90, label: '3 months' },
  { value: 120, label: '4 months' },
  { value: 150, label: '5 months' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
  { value: 730, label: '2 years' },
  { value: 1095, label: '3 years' },
  { value: 1825, label: '5 years' },
  { value: 3650, label: '10 years' },
  { value: 7300, label: '20 years' },
  { value: 18250, label: '50 years' },
  { value: 36500, label: '100 years' }
]

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDateDisplay(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatSaveTime(dateString: string | null) {
  if (!dateString) return 'Not saved yet'
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

type CalendarCell = { day: number | null; date: Date | null }

function buildMonthGrid(dateString: string) {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startDay = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const grid: CalendarCell[] = Array.from({ length: startDay }, () => ({ day: null, date: null }))
  for (let day = 1; day <= daysInMonth; day += 1) {
    grid.push({ day, date: new Date(year, month, day) })
  }

  while (grid.length % 7 !== 0) {
    grid.push({ day: null, date: null })
  }

  return grid
}

function getPaydayHighlights(baseDate: string, periodType: string) {
  const selectedDate = new Date(baseDate)
  const month = selectedDate.getMonth()
  const year = selectedDate.getFullYear()
  const day = selectedDate.getDate()
  const interval = periodType === 'Weekly' ? 7 : periodType === 'Biweekly' ? 14 : 30
  const dates = new Set<string>()

  const addIfSameMonth = (date: Date) => {
    if (date.getFullYear() === year && date.getMonth() === month) {
      dates.add(date.toISOString().slice(0, 10))
    }
  }

  let current = new Date(selectedDate)
  addIfSameMonth(current)

  while (current.getMonth() === month) {
    current = new Date(current)
    current.setDate(current.getDate() + interval)
    addIfSameMonth(current)
  }

  current = new Date(selectedDate)
  while (current.getMonth() === month) {
    current = new Date(current)
    current.setDate(current.getDate() - interval)
    addIfSameMonth(current)
  }

  return dates
}

export default function SettingsPage() {
  const {
    accounts,
    payPeriods,
    selectedPayPeriodId,
    defaultPayPeriodLabel,
    defaultPaycheckAmount,
    currency,
    selectedPayDate,
    forecastHorizon,
    notifications,
    setDefaultPayPeriodLabel,
    setDefaultPaycheckAmount,
    setSelectedPayDate,
    setForecastHorizon,
    setNotifications,
    applyMasterOverride,
    clearMasterOverrideRecord,
    masterOverrideRecord,
  } = useAppState()

  const [editMode, setEditMode] = useState(false)
  const [draftPayPeriod, setDraftPayPeriod] = useState(defaultPayPeriodLabel)
  const [draftPayDate, setDraftPayDate] = useState(selectedPayDate)
  const [draftHorizon, setDraftHorizon] = useState(forecastHorizon)
  const [draftNotifications, setDraftNotifications] = useState(notifications)
  const [draftPaycheckAmount, setDraftPaycheckAmount] = useState<number>(defaultPaycheckAmount)
  const [revealOverrideForm, setRevealOverrideForm] = useState(false)
  const [overridePayPeriodId, setOverridePayPeriodId] = useState<number>(selectedPayPeriodId)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideNotes, setOverrideNotes] = useState('')
  const [overrideConfirmChecked, setOverrideConfirmChecked] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [overrideDraftBalances, setOverrideDraftBalances] = useState<Record<string, string>>(() =>
    Object.fromEntries(accounts.map((account) => [account.id, String(account.balance)]))
  )
  const monthGrid = useMemo(() => buildMonthGrid(draftPayDate), [draftPayDate])
  const highlightedDates = useMemo(() => getPaydayHighlights(draftPayDate, draftPayPeriod), [draftPayDate, draftPayPeriod])
  const selectedOverridePeriod = payPeriods.find((period) => period.id === overridePayPeriodId) ?? payPeriods[0]

  const startEdit = () => {
    setDraftPayPeriod(defaultPayPeriodLabel)
    setDraftPayDate(selectedPayDate)
    setDraftHorizon(forecastHorizon)
    setDraftNotifications(notifications)
    setDraftPaycheckAmount(defaultPaycheckAmount)
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
  }

  const saveChanges = () => {
    setDefaultPayPeriodLabel(draftPayPeriod)
    setSelectedPayDate(draftPayDate)
    setForecastHorizon(draftHorizon)
    setNotifications(draftNotifications)
    setDefaultPaycheckAmount(Number(draftPaycheckAmount || 0))
    setEditMode(false)
  }

  const handleDayClick = (date: Date | null) => {
    if (!editMode || !date) {
      return
    }
    setDraftPayDate(date.toISOString().slice(0, 10))
  }

  const handleOverrideBalanceChange = (accountId: string, value: string) => {
    setOverrideDraftBalances((current) => ({ ...current, [accountId]: value }))
    setOverrideError(null)
  }

  const applyOverrideNow = () => {
    const parsed = accounts.reduce<Record<string, number>>((acc, account) => {
      const rawValue = overrideDraftBalances[account.id] ?? '0'
      const numericValue = Number(rawValue)
      if (Number.isFinite(numericValue)) {
        acc[account.id] = numericValue
      }
      return acc
    }, {})

    if (Object.keys(parsed).length !== accounts.length) {
      setOverrideError('Enter a valid number for every account.')
      return
    }

    const result = applyMasterOverride({
      payPeriodId: selectedOverridePeriod?.id ?? overridePayPeriodId,
      accountBalances: parsed,
      reason: overrideReason,
      notes: overrideNotes,
    })

    if (!result.ok) {
      setOverrideError(result.error)
      return
    }

    setOverrideConfirmChecked(false)
    setOverrideError(null)
  }

  return (
    <div className={`space-y-5 transition-colors ${editMode ? 'rounded-[1.75rem] bg-slate-50/50 p-5' : ''}`}>
      <div className={`rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/50 transition ${editMode ? 'ring-2 ring-slate-300/70' : ''}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">Configure your forecasting preferences and allocation rules.</p>
            {editMode ? <p className="text-sm text-slate-500">Edit mode is active. Save your changes when finished.</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {editMode ? (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveChanges}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Save changes
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Edit settings
              </button>
            )}
          </div>
        </div>
      </div>

      <Section title="Settings" description={editMode ? 'Edit your pay period preferences and notification settings.' : 'Review forecasting preferences and notification rules.'}>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Card title="Preferences">
              <div className="space-y-6 text-sm text-slate-600">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Pay period type</span>
                  {editMode ? (
                    <select
                      value={draftPayPeriod}
                      onChange={(event) => setDraftPayPeriod(event.target.value as typeof payPeriodOptions[number])}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                    >
                      {payPeriodOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-2 text-base font-semibold text-slate-900">{defaultPayPeriodLabel}</p>
                  )}
                </label>

                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Currency</span>
                  <div className="mt-2 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">USD</div>
                </label>

                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Paycheck amount</span>
                  {editMode ? (
                    <input
                      type="number"
                      value={draftPaycheckAmount}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setDraftPaycheckAmount(Number(e.target.value))}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                    />
                  ) : (
                    <p className="mt-2 text-base font-semibold text-slate-900">${defaultPaycheckAmount.toLocaleString()}</p>
                  )}
                </label>

                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Forecast horizon</span>
                  <p className="mt-1 text-xs leading-6 text-slate-500">This controls how far ahead the app shows your projected cash available and upcoming paychecks. It is not a target amount; it is only the length of the forecast.</p>
                  {editMode ? (
                    <select
                      value={draftHorizon}
                      onChange={(event) => setDraftHorizon(Number(event.target.value))}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
                    >
                      {forecastHorizonOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-2 text-base font-semibold text-slate-900">
                      {forecastHorizonOptions.find((option) => option.value === forecastHorizon)?.label ?? `${forecastHorizon} days`}
                    </p>
                  )}
                </label>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Payday</p>
                      <p className="text-xs text-slate-500">Choose the date when you receive your next paycheck.</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatDateDisplay(draftPayDate)}</p>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-7">
                    {dayNames.map((name) => (
                      <span key={name} className="text-center font-semibold">
                        {name}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-7">
                    {monthGrid.map((cell, index) => {
                      const cellDateString = cell.date ? cell.date.toISOString().slice(0, 10) : ''
                      const isSelected = cellDateString === draftPayDate
                      const isHighlighted = highlightedDates.has(cellDateString)
                      return (
                        <button
                          key={`${cell.day}-${index}`}
                          type="button"
                          disabled={!editMode || !cell.day}
                          onClick={() => handleDayClick(cell.date)}
                          className={`h-10 rounded-2xl border ${cell.day ? 'border-slate-200' : 'border-transparent'} transition-colors ${cell.day ? 'bg-white text-slate-900' : 'bg-transparent'} ${isHighlighted ? 'border-slate-900 bg-slate-900/10 text-slate-900' : ''} ${isSelected ? 'border-slate-900 bg-slate-900 text-white' : ''} ${!cell.day ? 'cursor-default opacity-30' : 'cursor-pointer hover:border-slate-400 hover:bg-slate-100'}`}
                        >
                          {cell.day ?? ''}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    When Biweekly is selected, the calendar highlights the next paydays in the same month.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Notifications" subtitle="Receive alerts for upcoming pay periods and low buffers.">
              <div className="space-y-4 text-sm text-slate-600">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={draftNotifications.email}
                    disabled={!editMode}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftNotifications({ ...draftNotifications, email: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  Email notifications
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={draftNotifications.push}
                    disabled={!editMode}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftNotifications({ ...draftNotifications, push: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  Push notifications
                </label>
              </div>
            </Card>

            <details className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                <div className="flex items-center justify-between">
                  <span>Advanced</span>
                  <span className="text-xs font-medium text-slate-500">Hidden tools</span>
                </div>
              </summary>

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Manual baseline override. Use only when your real balances do not match the model.
                </div>

                {!revealOverrideForm ? (
                  <button
                    type="button"
                    onClick={() => setRevealOverrideForm(true)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Reveal master override
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Apply to period</label>
                      <select
                        value={overridePayPeriodId}
                        onChange={(event) => setOverridePayPeriodId(Number(event.target.value))}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      >
                        {payPeriods.map((period) => (
                          <option key={period.id} value={period.id}>
                            {period.label} ({period.payDate})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      {accounts.map((account) => (
                        <label key={account.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                          <span>{account.name}</span>
                          <input
                            type="number"
                            value={overrideDraftBalances[account.id] ?? ''}
                            onChange={(event) => handleOverrideBalanceChange(account.id, event.target.value)}
                            className="w-36 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-right text-sm text-slate-900"
                          />
                        </label>
                      ))}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Reason (optional)</label>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(event) => setOverrideReason(event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Notes (optional)</label>
                      <textarea
                        value={overrideNotes}
                        onChange={(event) => setOverrideNotes(event.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </div>

                    <label className="flex items-start gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={overrideConfirmChecked}
                        onChange={(event) => setOverrideConfirmChecked(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      I understand this sets manual starting balances even if numbers do not add up.
                    </label>

                    {overrideError ? (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{overrideError}</p>
                    ) : null}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={applyOverrideNow}
                        disabled={!overrideConfirmChecked}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-800"
                      >
                        Apply override
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRevealOverrideForm(false)
                          setOverrideConfirmChecked(false)
                          setOverrideError(null)
                        }}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Hide
                      </button>
                    </div>

                    {masterOverrideRecord ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        <p className="font-semibold text-slate-900">Last override applied</p>
                        <p className="mt-1">Period: {payPeriods.find((period) => period.id === masterOverrideRecord.payPeriodId)?.label ?? masterOverrideRecord.payPeriodId}</p>
                        <p>Time: {formatSaveTime(masterOverrideRecord.appliedAt)}</p>
                        <button
                          type="button"
                          onClick={clearMasterOverrideRecord}
                          className="mt-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Clear override record
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </Section>
    </div>
  )
}
