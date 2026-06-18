import type { PayPeriod, RecurringExpense, RecurringFrequency } from './models'

export type { RecurringFrequency }

export interface RecurringExpenseTotals {
  fromSavings: number
  fromChecking: number
  fromCashApp: number
  groceries: number
  bus: number
}

function parseIsoDate(input: string): Date | null {
  const parts = input.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null
  const [year, month, day] = parts
  const out = new Date(year, month - 1, day)
  out.setHours(0, 0, 0, 0)
  return out
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date)
  out.setDate(out.getDate() + days)
  out.setHours(0, 0, 0, 0)
  return out
}

function parseDueDay(dueDate?: string): number | null {
  if (!dueDate) return null
  const match = dueDate.match(/\b([1-9]|[12][0-9]|3[01])\b/)
  if (!match) return null
  return Number(match[1])
}

function dueDateInMonth(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const clampedDay = Math.min(day, lastDay)
  const out = new Date(year, monthIndex, clampedDay)
  out.setHours(0, 0, 0, 0)
  return out
}

function isMonthlyBillDueInPayWindow(expense: RecurringExpense, periodIndex: number, payPeriods: PayPeriod[]): boolean {
  const current = payPeriods[periodIndex]
  if (!current) return false

  const start = parseIsoDate(current.payDate)
  if (!start) return false

  const nextPay = payPeriods[periodIndex + 1]
  const end = nextPay ? parseIsoDate(nextPay.payDate) : addDays(start, 14)
  if (!end) return false

  const day = parseDueDay(expense.dueDate)
  if (day == null) return false

  // Bill is considered due in [payday, next payday).
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const endCursor = new Date(end.getFullYear(), end.getMonth(), 1)

  while (cursor <= endCursor) {
    const candidate = dueDateInMonth(cursor.getFullYear(), cursor.getMonth(), day)
    if (candidate >= start && candidate < end) {
      return true
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return false
}

export function isRecurringExpenseDue(expense: RecurringExpense, periodIndex: number, payPeriods?: PayPeriod[]): boolean {
  if (expense.active === false) return false

  // For monthly-style bills, due date + paycheck dates are the source of truth.
  const isMonthlyStyle =
    expense.frequency === '1st paycheck of month' ||
    expense.frequency === '2nd paycheck of month' ||
    expense.frequency === 'Monthly'

  if (payPeriods && isMonthlyStyle) {
    const hasParseableDueDate = parseDueDay(expense.dueDate) != null
    if (hasParseableDueDate) {
      return isMonthlyBillDueInPayWindow(expense, periodIndex, payPeriods)
    }

    const dueByDate = isMonthlyBillDueInPayWindow(expense, periodIndex, payPeriods)
    if (dueByDate) return true
  }

  // Fallback for legacy records missing parseable due dates.
  const monthlyParity = periodIndex % 2
  switch (expense.frequency) {
    case 'Every paycheck':
      return true
    case '1st paycheck of month':
    case 'Monthly':
      return monthlyParity === 0
    case '2nd paycheck of month':
      return monthlyParity === 1
    case 'Custom':
      return expense.customInterval != null ? periodIndex % expense.customInterval === 0 : false
    default:
      return false
  }
}

export function getRecurringExpenseTotals(expenses: RecurringExpense[], periodIndex: number, payPeriods?: PayPeriod[]): RecurringExpenseTotals {
  const totals: RecurringExpenseTotals = { fromSavings: 0, fromChecking: 0, fromCashApp: 0, groceries: 0, bus: 0 }
  for (const expense of expenses) {
    if (!isRecurringExpenseDue(expense, periodIndex, payPeriods)) continue
    const src = expense.sourceAccount ?? 'savings'
    if (src === 'savings') {
      totals.fromSavings += expense.amount
    } else if (src === 'checking') {
      totals.fromChecking += expense.amount
    } else if (src === 'cashApp') {
      totals.fromCashApp += expense.amount
      if (expense.category === 'groceries') totals.groceries += expense.amount
      if (expense.category === 'bus') totals.bus += expense.amount
    }
  }
  return totals
}

export interface RecurringExpenseOccurrence {
  expense: RecurringExpense
  periodIndex: number
}

export function getUpcomingOccurrences(
  expenses: RecurringExpense[],
  startPeriodIndex: number,
  count: number,
  payPeriods?: PayPeriod[]
): RecurringExpenseOccurrence[] {
  const occurrences: RecurringExpenseOccurrence[] = []
  let i = startPeriodIndex
  while (occurrences.length < count && i <= startPeriodIndex + 20) {
    for (const expense of expenses) {
      if (isRecurringExpenseDue(expense, i, payPeriods)) {
        occurrences.push({ expense, periodIndex: i })
      }
    }
    i++
  }
  return occurrences.slice(0, count)
}
