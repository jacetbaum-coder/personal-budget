export function calculateProjectedLeftover(
  paycheck: number,
  rentTransfer: number,
  openbankTransfer: number,
  creditCards: number,
  subscriptions: number,
  insurance: number
) {
  return paycheck - rentTransfer - openbankTransfer - creditCards - subscriptions - insurance
}

export function calculateCashAppTransfer(groceries: number, bus: number) {
  return groceries + bus
}

export function calculateSafetyBuffer(balance: number) {
  if (balance <= 100) {
    return 0
  }

  if (balance < 200) {
    return Math.round(balance * 0.1)
  }

  if (balance < 400) {
    return Math.round(balance * 0.2)
  }

  return Math.round(balance * 0.3)
}

export function calculateAvailableSpending(leftover: number, safetyBuffer: number) {
  return leftover - safetyBuffer
}
