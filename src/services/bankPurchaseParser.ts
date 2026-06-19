import type { TransactionCategory } from '../models'

export interface ParsedBankPurchase {
  id: string
  raw: string
  amount: number
  merchant: string
  dateText: string | null
  suggestedCategory: TransactionCategory
  needsReview: boolean
}

const CATEGORY_RULES: Array<{ category: TransactionCategory; keys: string[] }> = [
  { category: 'transfer', keys: ['CASH APP', 'PMNT SENT', 'ZELLE', 'VENMO'] },
  { category: 'subscriptions', keys: ['GITHUB', 'SPOTIFY', 'NETFLIX', 'APPLE.COM/BILL', 'GOOGLE *', 'GOOGLE PLAY'] },
  { category: 'amazon', keys: ['AMAZON', 'AMZN', 'AMAZON MKTPLACE', 'AMAZON RETAIL', 'AMAZON PRIME'] },
  { category: 'transportation', keys: ['UBER', 'LYFT', 'BART', 'MUNI', 'TRANSIT'] },
  { category: 'groceries', keys: ['SAFEWAY', 'TRADER JOE', 'WHOLE FOODS', 'GROCERY', 'COSTCO'] },
  { category: 'foodAndDrink', keys: ['STARBUCKS', 'COFFEE', 'RESTAURANT', 'DOORDASH', 'UBER EATS'] },
]

function normalizeMerchant(raw: string): string {
  return raw
    .replace(/\+X{2,}\d+/gi, '')
    .replace(/\b(?:CA|WA|OR|NY|TX|FL)\b\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function categoryFromMerchant(merchant: string): TransactionCategory {
  const upper = merchant.toUpperCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keys.some((key) => upper.includes(key))) {
      return rule.category
    }
  }
  return 'other'
}

function parseLine(line: string, idx: number): ParsedBankPurchase | null {
  const amountMatch = line.match(/-\$\s*([0-9]+(?:\.[0-9]{2})?)/)
  if (!amountMatch) return null

  const amount = Number(amountMatch[1])
  if (!Number.isFinite(amount)) return null

  const dateMatch = line.match(/\b(\d{2}\/\d{2})\b/)
  const dateText = dateMatch?.[1] ?? null

  let merchant = ''
  if (/PMNT SENT/i.test(line)) {
    merchant = line.split(/PMNT SENT\s+\d{2}\/\d{2}\s*/i)[1] ?? ''
  } else if (/PURCHASE/i.test(line)) {
    merchant = line.split(/PURCHASE\s*(?:\d{2}\/\d{2}\s*)?/i)[1] ?? ''
  } else if (/ON\s+\d{2}\/\d{2}/i.test(line)) {
    merchant = line.split(/ON\s+\d{2}\/\d{2}/i)[0] ?? ''
  }

  if (!merchant) {
    merchant = line
      .replace(/-\$\s*[0-9]+(?:\.[0-9]{2})?/g, '')
      .replace(/\$\s*[0-9]+(?:\.[0-9]{2})?/g, '')
      .replace(/\b(?:Debit|Processing|PURCHASE|PMNT SENT|ON)\b/gi, '')
      .replace(/\d{2}\/\d{2}/g, '')
  }

  merchant = normalizeMerchant(merchant)
  if (!merchant) merchant = 'Unknown merchant'

  const suggestedCategory = categoryFromMerchant(merchant)
  return {
    id: `${Date.now()}-${idx}`,
    raw: line,
    amount,
    merchant,
    dateText,
    suggestedCategory,
    needsReview: suggestedCategory === 'other',
  }
}

export function parseBankPurchaseInput(input: string): ParsedBankPurchase[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const parsed: ParsedBankPurchase[] = []
  lines.forEach((line, idx) => {
    const item = parseLine(line, idx)
    if (item) parsed.push(item)
  })

  return parsed
}
