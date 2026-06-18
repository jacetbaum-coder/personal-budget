// AccountId is a plain string so users can add custom accounts at runtime.
export type AccountId = string

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
  | 'utilities'
  | 'subscription'
  | 'advisor'
  | 'groceries'
  | 'bus'
  | 'studentLoans'
  | 'other'

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  creditCards:  'Credit Card',
  insurance:    'Insurance',
  utilities:    'Utilities',
  subscription: 'Subscription',
  advisor:      'Advisor / Service',
  groceries:    'Groceries',
  bus:          'Bus / Transit',
  studentLoans: 'Student Loans',
  other:        'Other',
}

export interface RecurringExpense {
  id: number
  name: string
  amount: number
  frequency: RecurringFrequency
  category: ExpenseCategory
  /** Which account this expense draws from. */
  sourceAccount: AccountId
  /** 0 = even-indexed periods (default), 1 = odd-indexed periods. */
  cycleOffset?: number
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
  balanceAdjustments: Record<string, number>
}

// ── Actual data ───────────────────────────────────────────────────────────────

export const sampleAccounts: Account[] = [
  { id: 'savings',  name: 'BofA Savings',       balance: 1200 },
  { id: 'rentFund', name: 'BofA Rent Holdings',  balance: 600  },
  { id: 'openbank', name: 'OpenBank',             balance: 2268 },
  { id: 'checking', name: 'BofA Checkings',       balance: 310  },
  { id: 'cashApp',  name: 'CashApp',              balance: 45   },
]

// Active periods Jun 18 → Sep 11, 2026.
// Index 0 (Jun 18) = EVEN cycle: Quicksilver, Amazon, Stupid pets52, Pet Insurance.
// Index 1 (Jul 3)  = ODD  cycle: VentureOne, Utilities, Planet Fitness, Spotify.
export const samplePayPeriods: PayPeriod[] = [
  { id: 1, label: 'Jun 18', payDate: '2026-06-18', payAmount: 1454, transfers: { rent: 600, openbank: 200 } },
  { id: 2, label: 'Jul 3',  payDate: '2026-07-03', payAmount: 1454, transfers: { rent: 600, openbank: 200 } },
  { id: 3, label: 'Jul 17', payDate: '2026-07-17', payAmount: 1454, transfers: { rent: 600, openbank: 200 } },
  { id: 4, label: 'Jul 31', payDate: '2026-07-31', payAmount: 1454, transfers: { rent: 600, openbank: 200 } },
  { id: 5, label: 'Aug 14', payDate: '2026-08-14', payAmount: 1454, transfers: { rent: 600, openbank: 200 } },
  { id: 6, label: 'Aug 28', payDate: '2026-08-28', payAmount: 1454, transfers: { rent: 600, openbank: 200 } },
  { id: 7, label: 'Sep 11', payDate: '2026-09-11', payAmount: 1555, transfers: { rent: 600, openbank: 200 } },
]

export const sampleRecurringExpenses: RecurringExpense[] = [
  // ── From BofA Savings ────────────────────────────────────────────────────
  { id: 1,  name: 'Quicksilver',       amount: 100,   frequency: 'Every other paycheck', category: 'creditCards',  sourceAccount: 'savings',  cycleOffset: 0 },
  { id: 2,  name: 'Utilities',         amount: 130,   frequency: 'Every other paycheck', category: 'utilities',    sourceAccount: 'savings',  cycleOffset: 1 },
  { id: 3,  name: 'Stupid pets52',     amount: 5.99,  frequency: 'Every other paycheck', category: 'subscription', sourceAccount: 'savings',  cycleOffset: 0 },
  { id: 4,  name: 'Pet Insurance',     amount: 25.07, frequency: 'Every other paycheck', category: 'insurance',    sourceAccount: 'savings',  cycleOffset: 0 },
  { id: 5,  name: 'Chris Lex Advisor', amount: 25,    frequency: 'Every paycheck',       category: 'advisor',      sourceAccount: 'savings'                   },
  { id: 6,  name: 'VentureOne',        amount: 115,   frequency: 'Every other paycheck', category: 'creditCards',  sourceAccount: 'savings',  cycleOffset: 1 },
  { id: 7,  name: 'Student Loans',     amount: 0,     frequency: 'Every paycheck',       category: 'studentLoans', sourceAccount: 'savings'                   },
  // ── From BofA Checkings ──────────────────────────────────────────────────
  { id: 8,  name: 'Planet Fitness',    amount: 16,    frequency: 'Every other paycheck', category: 'subscription', sourceAccount: 'checking', cycleOffset: 1 },
  { id: 9,  name: 'Spotify',           amount: 13,    frequency: 'Every other paycheck', category: 'subscription', sourceAccount: 'checking', cycleOffset: 1 },
  { id: 10, name: 'Amazon',            amount: 16,    frequency: 'Every other paycheck', category: 'subscription', sourceAccount: 'checking', cycleOffset: 0 },
  { id: 11, name: 'Google Pay',        amount: 0,     frequency: 'Every paycheck',       category: 'other',        sourceAccount: 'checking'                  },
  // ── Via CashApp (loaded from Checkings) ──────────────────────────────────
  { id: 12, name: 'Groceries',         amount: 70,    frequency: 'Every paycheck',       category: 'groceries',    sourceAccount: 'cashApp'                   },
  { id: 13, name: 'Bus',               amount: 25,    frequency: 'Every paycheck',       category: 'bus',          sourceAccount: 'cashApp'                   },
]

export const sampleForecastPoints: ForecastPoint[] = []
