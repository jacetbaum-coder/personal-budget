export function calculateProjectedLeftover(
  paycheck: number,
  rentTransfer: number,
  openbankTransfer: number,
  savingsExpenses: number
) {
  return paycheck - rentTransfer - openbankTransfer - savingsExpenses
}

export function calculateCashAppTransfer(groceries: number, bus: number) {
  return groceries + bus
}

// Two fixed $100 safety buffers: one for BofA Savings, one for BofA Checkings.
export const SAVINGS_BUFFER = 100
export const CHECKING_BUFFER = 100
export const TOTAL_SAFETY_BUFFER = SAVINGS_BUFFER + CHECKING_BUFFER

export function calculateSafetyBuffer() {
  return TOTAL_SAFETY_BUFFER
}

export function calculateAvailableSpending(leftover: number) {
  return leftover - TOTAL_SAFETY_BUFFER
}
