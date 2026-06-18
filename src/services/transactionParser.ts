import type { AccountId, TransactionCategory, TransactionRecord, TransactionType } from '../models'

const accountMap: Record<string, AccountId> = {
  checking: 'checking',
  savings: 'savings',
  openbank: 'openbank',
  cashapp: 'cashApp',
  cash: 'cashApp',
  rent: 'rentFund'
}

const categoryMap: Record<string, TransactionCategory> = {
  bagel: 'foodAndDrink',
  coffee: 'foodAndDrink',
  food: 'foodAndDrink',
  drink: 'foodAndDrink',
  amazon: 'amazon',
  subscription: 'subscriptions',
  groceries: 'groceries',
  bus: 'transportation',
  rent: 'rent',
  paycheck: 'income',
  salary: 'income'
}

export interface ParsedTransaction {
  description: string
  amount: number
  source?: AccountId
  destination?: AccountId
  type: TransactionType
  category: TransactionCategory
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s$\.]/g, ' ')
}

function parseAmount(text: string): number {
  const match = text.match(/\$?([0-9]+(?:\.[0-9]{1,2})?)/)
  return match ? Number(match[1]) : 0
}

function findAccount(text: string, positive = true): AccountId | undefined {
  const tokens = normalizeText(text).split(/\s+/)
  for (const token of tokens) {
    if (accountMap[token]) {
      return accountMap[token]
    }
  }

  if (positive) {
    if (text.includes('deposit') || text.includes('transfer into') || text.includes('into')) {
      return 'checking'
    }
  }

  return undefined
}

function determineType(text: string, amount: number): TransactionType {
  if (/transfer|moved|moved from|moved to/.test(text)) {
    return 'transfer'
  }
  if (/paid|purchase|bought|spent|spent on/.test(text)) {
    return 'expense'
  }
  if (/received|deposit|income|got paid|paycheck/.test(text) || amount > 0 && /from/.test(text)) {
    return 'income'
  }
  return 'adjustment'
}

function determineCategory(text: string, type: TransactionType): TransactionCategory {
  const normalized = normalizeText(text)
  for (const key of Object.keys(categoryMap)) {
    if (normalized.includes(key)) {
      return categoryMap[key]
    }
  }

  if (type === 'transfer') {
    return 'transfer'
  }

  if (type === 'income') {
    return 'income'
  }

  return 'uncategorized'
}

export function parseTransactionInput(text: string): ParsedTransaction {
  const cleaned = normalizeText(text)
  const amount = parseAmount(cleaned)
  const isTransfer = /transfer|moved|from .* to|into/.test(cleaned)

  let source: AccountId | undefined
  let destination: AccountId | undefined

  if (isTransfer) {
    const segments = cleaned.split(/(?:from|to|into)/).map((segment) => segment.trim())
    if (segments.length >= 3) {
      source = findAccount(segments[1], true)
      destination = findAccount(segments[2], false)
    } else {
      source = findAccount(cleaned, true)
      destination = findAccount(cleaned.replace(source ?? '', ''), false)
    }
  } else {
    source = findAccount(cleaned, true)
  }

  const type = determineType(cleaned, amount)
  const category = determineCategory(cleaned, type)

  return {
    description: text,
    amount,
    source,
    destination,
    type,
    category
  }
}

export function createTransactionRecord(parsed: ParsedTransaction): TransactionRecord {
  const now = new Date().toISOString()
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    description: parsed.description,
    amount: parsed.amount,
    source: parsed.source,
    destination: parsed.destination,
    type: parsed.type,
    category: parsed.category,
    impact: parsed.type === 'expense' ? 'reduced' : parsed.type === 'income' ? 'increased' : 'neutral'
  }
}
