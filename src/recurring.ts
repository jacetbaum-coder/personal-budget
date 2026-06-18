import type { RecurringExpense, RecurringFrequency } from './models'

export type { RecurringFrequency }

export interface RecurringExpenseTotals {
  fromSavings: number
  fromChecking: number
  fromCashApp: number
  groceries: number
  bus: number
}

export function isRecurringExpenseDue(expense: RecurringExpense, periodIndex: number): boolean {
  if (expense.active === false) return false
  // periodIndex 0 (Jun 18) is EVEN cycle in this app's budgeting flow.
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

export function getRecurringExpenseTotals(expenses: RecurringExpense[], periodIndex: number): RecurringExpenseTotals {
  const totals: RecurringExpenseTotals = { fromSavings: 0, fromChecking: 0, fromCashApp: 0, groceries: 0, bus: 0 }
  for (const expense of expenses) {
    if (!isRecurringExpenseDue(expense, periodIndex)) continue
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
  count: number
): RecurringExpenseOccurrence[] {
  const occurrences: RecurringExpenseOccurrence[] = []
  let i = startPeriodIndex
  while (occurrences.length < count && i <= startPeriodIndex + 20) {
    for (const expense of expenses) {
      if (isRecurringExpenseDue(expense, i)) {
        occurrences.push({ expense, periodIndex: i })
      }
    }
    i++
  }
  return occurrences.slice(0, count)
}
