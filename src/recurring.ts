import type { ExpenseCategory, RecurringExpense, RecurringFrequency } from './models'

export type { RecurringFrequency }

export interface RecurringExpenseTotals {
  creditCards: number
  insurance: number
  spotify: number
  amazon: number
  groceries: number
  bus: number
  other: number
}

export function isRecurringExpenseDue(expense: RecurringExpense, periodIndex: number) {
  if (expense.frequency === 'Every paycheck') {
    return true
  }

  if (expense.frequency === 'Every other paycheck') {
    return periodIndex % 2 === 0
  }

  if (expense.frequency === 'Monthly') {
    return periodIndex % 2 === 0
  }

  if (expense.frequency === 'Custom') {
    return expense.customInterval ? periodIndex % expense.customInterval === 0 : false
  }

  return false
}

export function getRecurringExpenseTotals(expenses: RecurringExpense[], periodIndex: number): RecurringExpenseTotals {
  return expenses.reduce<RecurringExpenseTotals>((totals, expense) => {
    if (!isRecurringExpenseDue(expense, periodIndex)) {
      return totals
    }

    switch (expense.category) {
      case 'creditCards':
        totals.creditCards += expense.amount
        break
      case 'insurance':
        totals.insurance += expense.amount
        break
      case 'spotify':
        totals.spotify += expense.amount
        break
      case 'amazon':
        totals.amazon += expense.amount
        break
      case 'groceries':
        totals.groceries += expense.amount
        break
      case 'bus':
        totals.bus += expense.amount
        break
      default:
        totals.other += expense.amount
    }

    return totals
  }, {
    creditCards: 0,
    insurance: 0,
    spotify: 0,
    amazon: 0,
    groceries: 0,
    bus: 0,
    other: 0
  })
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
  let currentIndex = startPeriodIndex

  while (occurrences.length < count) {
    expenses.forEach((expense) => {
      if (isRecurringExpenseDue(expense, currentIndex)) {
        occurrences.push({ expense, periodIndex: currentIndex })
      }
    })
    currentIndex += 1
    if (currentIndex > startPeriodIndex + 20) {
      break
    }
  }

  return occurrences.slice(0, count)
}
