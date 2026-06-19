// AccountId is a plain string so users can add custom accounts at runtime.
export type AccountId = string

export interface Account {
  id: AccountId
  name: string
  balance: number
  color?: string
}

// ── Account color palette ─────────────────────────────────────────────────────
export type AccountColor =
  | 'blue' | 'sky' | 'emerald' | 'violet' | 'amber' | 'rose' | 'orange' | 'teal' | 'slate'

export const accountColorOptions: { value: AccountColor; label: string; dot: string; border: string; badge: string }[] = [
  { value: 'blue',    label: 'Blue',    dot: 'bg-blue-400',    border: 'border-l-blue-400',    badge: 'bg-blue-100 text-blue-700'    },
  { value: 'sky',     label: 'Sky',     dot: 'bg-sky-400',     border: 'border-l-sky-400',     badge: 'bg-sky-100 text-sky-700'      },
  { value: 'emerald', label: 'Emerald', dot: 'bg-emerald-400', border: 'border-l-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
  { value: 'violet',  label: 'Violet',  dot: 'bg-violet-400',  border: 'border-l-violet-400',  badge: 'bg-violet-100 text-violet-700'  },
  { value: 'amber',   label: 'Amber',   dot: 'bg-amber-400',   border: 'border-l-amber-400',   badge: 'bg-amber-100 text-amber-700'    },
  { value: 'rose',    label: 'Rose',    dot: 'bg-rose-400',    border: 'border-l-rose-400',    badge: 'bg-rose-100 text-rose-700'      },
  { value: 'orange',  label: 'Orange',  dot: 'bg-orange-400',  border: 'border-l-orange-400',  badge: 'bg-orange-100 text-orange-700'  },
  { value: 'teal',    label: 'Teal',    dot: 'bg-teal-400',    border: 'border-l-teal-400',    badge: 'bg-teal-100 text-teal-700'      },
  { value: 'slate',   label: 'Slate',   dot: 'bg-slate-400',   border: 'border-l-slate-400',   badge: 'bg-slate-100 text-slate-700'    },
]

export interface PayPeriod {
  id: number
  label: string
  payDate: string
  payAmount: number
  /** Optional per-account starting balances before paycheck lands for this period. */
  startingBalances?: Record<AccountId, number>
  /** Saved spending target for this period's allocation slider. */
  spendingMoneyTarget?: number
  /** Prevent accidental slider movement when true. */
  spendingMoneyLocked?: boolean
  transfers: {
    rent: number
    openbank: number
  }
}

export type RecurringFrequency =
  | 'Every paycheck'
  | '1st paycheck of month'
  | '2nd paycheck of month'
  | 'Monthly'
  | 'Custom'

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
  /** Optional bill due date, e.g. "the 15th" or "2026-07-15" — display only. */
  dueDate?: string
  customInterval?: number
  /** When false, expense is parked/paused — not counted in totals or shown as due. Omitting = active. */
  active?: boolean
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
  customCategoryLabel?: string
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

export interface MasterOverrideRecord {
  payPeriodId: number
  accountBalances: Record<AccountId, number>
  reason?: string
  notes?: string
  appliedAt: string
}

// ── Actual data ───────────────────────────────────────────────────────────────

export const sampleAccounts: Account[] = [
  { id: 'savings',  name: 'BofA Savings',       balance: 1200, color: 'blue'    },
  { id: 'rentFund', name: 'BofA Rent Holdings',  balance: 600,  color: 'violet'  },
  { id: 'openbank', name: 'OpenBank',             balance: 2268, color: 'emerald' },
  { id: 'checking', name: 'BofA Checkings',       balance: 310,  color: 'sky'     },
  { id: 'cashApp',  name: 'CashApp',              balance: 45,   color: 'amber'   },
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
  { id: 1,  name: 'Quicksilver',       amount: 100,   frequency: '1st paycheck of month', category: 'creditCards',  sourceAccount: 'savings',  dueDate: 'the 25th' },
  { id: 2,  name: 'Utilities',         amount: 130,   frequency: '2nd paycheck of month', category: 'utilities',    sourceAccount: 'savings',  dueDate: 'the 15th' },
  { id: 3,  name: 'Stupid pets52',     amount: 5.99,  frequency: '1st paycheck of month', category: 'subscription', sourceAccount: 'savings'  },
  { id: 4,  name: 'Pet Insurance',     amount: 25.07, frequency: '1st paycheck of month', category: 'insurance',    sourceAccount: 'savings',  dueDate: 'the 10th' },
  { id: 5,  name: 'Chris Lex Advisor', amount: 25,    frequency: 'Every paycheck',        category: 'advisor',      sourceAccount: 'savings'  },
  { id: 6,  name: 'VentureOne',        amount: 115,   frequency: '2nd paycheck of month', category: 'creditCards',  sourceAccount: 'savings',  dueDate: 'the 22nd' },
  { id: 7,  name: 'Student Loans',     amount: 0,     frequency: 'Every paycheck',        category: 'studentLoans', sourceAccount: 'savings'  },
  // ── From BofA Checkings ──────────────────────────────────────────────────
  { id: 8,  name: 'Planet Fitness',    amount: 16,    frequency: '2nd paycheck of month', category: 'subscription', sourceAccount: 'checking', dueDate: 'the 1st'  },
  { id: 9,  name: 'Spotify',           amount: 13,    frequency: '2nd paycheck of month', category: 'subscription', sourceAccount: 'checking', dueDate: 'the 9th'  },
  { id: 10, name: 'Amazon',            amount: 16,    frequency: '1st paycheck of month', category: 'subscription', sourceAccount: 'checking', dueDate: 'the 12th' },
  { id: 11, name: 'Google Pay',        amount: 0,     frequency: 'Every paycheck',        category: 'other',        sourceAccount: 'checking' },
  // ── Via CashApp (loaded from Checkings) ──────────────────────────────────
  { id: 12, name: 'Groceries',         amount: 70,    frequency: 'Every paycheck',        category: 'groceries',    sourceAccount: 'cashApp'  },
  { id: 13, name: 'Bus',               amount: 25,    frequency: 'Every paycheck',        category: 'bus',          sourceAccount: 'cashApp'  },
]

export const sampleForecastPoints: ForecastPoint[] = []
