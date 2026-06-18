export type AccountId = 'checking' | 'savings' | 'openbank' | 'rentFund' | 'cashApp'

export interface Account {
  id: AccountId
  name: string
  balance: number
}

export interface PayPeriod {
  id: number
  label: string
  payDate: string
  payAmount: number
  transfers: {
    rent: number
    openbank: number
  }
}

export type RecurringFrequency = 'Every paycheck' | 'Every other paycheck' | 'Monthly' | 'Custom'

export type ExpenseCategory =
  | 'creditCards'
  | 'insurance'
  | 'spotify'
  | 'amazon'
  | 'other'
  | 'groceries'
  | 'bus'

export interface RecurringExpense {
  id: number
  name: string
  amount: number
  frequency: RecurringFrequency
  category: ExpenseCategory
  customInterval?: number
}

export type TransactionType = 'transfer' | 'expense' | 'income' | 'adjustment'

export type TransactionCategory =
  | 'transfer'
  | 'uncategorized'
  | 'foodAndDrink'
  | 'subscriptions'
  | 'transportation'
  | 'groceries'
  | 'amazon'
  | 'rent'
  | 'income'
  | 'other'

export interface TransactionRecord {
  id: string
  createdAt: string
  description: string
  amount: number
  source?: AccountId
  destination?: AccountId
  type: TransactionType
  category: TransactionCategory
  impact: 'reduced' | 'increased' | 'neutral'
}

export const transactionCategoryLabels: Record<TransactionCategory, string> = {
  transfer: 'Transfer',
  uncategorized: 'Uncategorized',
  foodAndDrink: 'Food & Drink',
  subscriptions: 'Subscriptions',
  transportation: 'Transportation',
  groceries: 'Groceries',
  amazon: 'Amazon',
  rent: 'Rent',
  income: 'Income',
  other: 'Other'
}

export const transactionTypeLabels: Record<TransactionType, string> = {
  transfer: 'Transfer',
  expense: 'Expense',
  income: 'Income',
  adjustment: 'Adjustment'
}

export interface ForecastPoint {
  id: number
  dateLabel: string
  date: string
  payPeriodId: number
  balanceAdjustments: Partial<Record<AccountId, number>>
}

export const sampleAccounts: Account[] = [
  { id: 'checking', name: 'Checking', balance: 4120 },
  { id: 'savings', name: 'Savings', balance: 5800 },
  { id: 'openbank', name: 'Openbank', balance: 860 },
  { id: 'rentFund', name: 'Rent Fund', balance: 1950 },
  { id: 'cashApp', name: 'CashApp', balance: 320 }
]

export const samplePayPeriods: PayPeriod[] = [
  { id: 1, label: 'Jun 24 – Jul 7', payDate: 'Jun 28', payAmount: 3450, transfers: { rent: 1100, openbank: 420 } },
  { id: 2, label: 'Jul 8 – Jul 21', payDate: 'Jul 12', payAmount: 3450, transfers: { rent: 1100, openbank: 450 } },
  { id: 3, label: 'Jul 22 – Aug 4', payDate: 'Jul 26', payAmount: 3450, transfers: { rent: 1100, openbank: 430 } }
]

export const sampleRecurringExpenses: RecurringExpense[] = [
  { id: 1, name: 'Credit Card Payment', amount: 285, frequency: 'Every paycheck', category: 'creditCards' },
  { id: 2, name: 'Insurance', amount: 90, frequency: 'Every other paycheck', category: 'insurance' },
  { id: 3, name: 'Spotify', amount: 15, frequency: 'Monthly', category: 'spotify' },
  { id: 4, name: 'Amazon', amount: 22, frequency: 'Monthly', category: 'amazon' },
  { id: 5, name: 'Groceries', amount: 235, frequency: 'Every paycheck', category: 'groceries' },
  { id: 6, name: 'Bus', amount: 62, frequency: 'Every paycheck', category: 'bus' },
  { id: 7, name: 'Gym membership', amount: 48, frequency: 'Custom', category: 'other', customInterval: 3 }
]

export const sampleForecastPoints: ForecastPoint[] = [
  {
    id: 1,
    dateLabel: 'Jun 19',
    date: '2026-06-19',
    payPeriodId: 1,
    balanceAdjustments: { checking: -120, savings: 120, rentFund: 100, openbank: 0, cashApp: 20 }
  },
  {
    id: 2,
    dateLabel: 'Jul 3',
    date: '2026-07-03',
    payPeriodId: 1,
    balanceAdjustments: { checking: 200, savings: 80, rentFund: 30, openbank: 40, cashApp: 10 }
  },
  {
    id: 3,
    dateLabel: 'Jul 17',
    date: '2026-07-17',
    payPeriodId: 2,
    balanceAdjustments: { checking: -100, savings: 150, rentFund: 70, openbank: 20, cashApp: -10 }
  },
  {
    id: 4,
    dateLabel: 'Jul 31',
    date: '2026-07-31',
    payPeriodId: 3,
    balanceAdjustments: { checking: 220, savings: 170, rentFund: 70, openbank: 40, cashApp: 10 }
  }
]
