import type { TransactionRecord, PayPeriod } from '../models'

// Historical data from Oct 2025 - Jul 2026 Excel export
export const historicalTransactions: TransactionRecord[] = [
  // Oct 2025 - Jan 2026 Period
  // Oct 10
  { id: 'hist-oct10-rent', createdAt: '2025-10-10T00:00:00Z', description: 'Rent (shared house)', amount: 394.98, source: 'savings', type: 'expense', category: 'rent', impact: 'reduced' },
  { id: 'hist-oct10-venture', createdAt: '2025-10-10T00:00:00Z', description: 'VentureOne Credit Card', amount: 175, source: 'savings', type: 'expense', category: 'subscriptions', impact: 'reduced' },
  { id: 'hist-oct10-openbank', createdAt: '2025-10-10T00:00:00Z', description: 'Transfer to OpenBank', amount: 500, source: 'savings', destination: 'openbank', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-oct10-cashapp', createdAt: '2025-10-10T00:00:00Z', description: 'CashApp load (groceries, bus)', amount: 250, source: 'checking', destination: 'cashApp', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-oct10-groceries', createdAt: '2025-10-10T00:00:00Z', description: 'Groceries', amount: 100, source: 'cashApp', type: 'expense', category: 'groceries', impact: 'reduced' },
  { id: 'hist-oct10-bus', createdAt: '2025-10-10T00:00:00Z', description: 'Bus', amount: 50, source: 'cashApp', type: 'expense', category: 'transportation', impact: 'reduced' },
  { id: 'hist-oct10-subs', createdAt: '2025-10-10T00:00:00Z', description: 'Subscriptions (Amazon, Spotify, YouTube)', amount: 16, source: 'checking', type: 'expense', category: 'subscriptions', impact: 'reduced' },

  // Oct 24
  { id: 'hist-oct24-rent', createdAt: '2025-10-24T00:00:00Z', description: 'Rent (shared house)', amount: 502, source: 'savings', type: 'expense', category: 'rent', impact: 'reduced' },
  { id: 'hist-oct24-utilities', createdAt: '2025-10-24T00:00:00Z', description: 'Utilities (via CashApp)', amount: 100, source: 'cashApp', type: 'expense', category: 'other', customCategoryLabel: 'Utilities', impact: 'reduced' },
  { id: 'hist-oct24-openbank', createdAt: '2025-10-24T00:00:00Z', description: 'Transfer to OpenBank', amount: 360, source: 'savings', destination: 'openbank', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-oct24-openbank-manual', createdAt: '2025-10-24T00:00:00Z', description: 'Manual OpenBank deposit', amount: 230, destination: 'openbank', type: 'income', category: 'income', impact: 'increased' },
  { id: 'hist-oct24-cashapp', createdAt: '2025-10-24T00:00:00Z', description: 'CashApp load', amount: 180, source: 'checking', destination: 'cashApp', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-oct24-groceries', createdAt: '2025-10-24T00:00:00Z', description: 'Groceries', amount: 100, source: 'cashApp', type: 'expense', category: 'groceries', impact: 'reduced' },
  { id: 'hist-oct24-bus', createdAt: '2025-10-24T00:00:00Z', description: 'Bus', amount: 50, source: 'cashApp', type: 'expense', category: 'transportation', impact: 'reduced' },
  { id: 'hist-oct24-toiletries', createdAt: '2025-10-24T00:00:00Z', description: 'Toiletries', amount: 30, source: 'cashApp', type: 'expense', category: 'other', customCategoryLabel: 'Toiletries', impact: 'reduced' },
  { id: 'hist-oct24-subs', createdAt: '2025-10-24T00:00:00Z', description: 'Subscriptions', amount: 12, source: 'checking', type: 'expense', category: 'subscriptions', impact: 'reduced' },
  { id: 'hist-oct24-spending', createdAt: '2025-10-24T00:00:00Z', description: 'Spending money (actual)', amount: 48, source: 'checking', type: 'expense', category: 'other', customCategoryLabel: 'Spending', impact: 'reduced' },

  // Nov 7
  { id: 'hist-nov7-rent', createdAt: '2025-11-07T00:00:00Z', description: 'Rent (shared house)', amount: 502.49, source: 'savings', type: 'expense', category: 'rent', impact: 'reduced' },
  { id: 'hist-nov7-quicksilver', createdAt: '2025-11-07T00:00:00Z', description: 'Quicksilver Credit Card', amount: 78, source: 'savings', type: 'expense', category: 'subscriptions', customCategoryLabel: 'Credit Card Payment', impact: 'reduced' },
  { id: 'hist-nov7-venture', createdAt: '2025-11-07T00:00:00Z', description: 'VentureOne Credit Card', amount: 175, source: 'savings', type: 'expense', category: 'subscriptions', customCategoryLabel: 'Credit Card Payment', impact: 'reduced' },
  { id: 'hist-nov7-cashapp', createdAt: '2025-11-07T00:00:00Z', description: 'CashApp load', amount: 150, source: 'checking', destination: 'cashApp', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-nov7-groceries', createdAt: '2025-11-07T00:00:00Z', description: 'Groceries (actual)', amount: 14.39, source: 'cashApp', type: 'expense', category: 'groceries', impact: 'reduced' },
  { id: 'hist-nov7-bus', createdAt: '2025-11-07T00:00:00Z', description: 'Bus (actual)', amount: 12.50, source: 'cashApp', type: 'expense', category: 'transportation', impact: 'reduced' },
  { id: 'hist-nov7-subs', createdAt: '2025-11-07T00:00:00Z', description: 'Subscriptions', amount: 16, source: 'checking', type: 'expense', category: 'subscriptions', impact: 'reduced' },
  { id: 'hist-nov7-spending', createdAt: '2025-11-07T00:00:00Z', description: 'Spending money (actual)', amount: 52.04, source: 'checking', type: 'expense', category: 'other', customCategoryLabel: 'Spending', impact: 'reduced' },

  // Nov 21
  { id: 'hist-nov21-rent', createdAt: '2025-11-21T00:00:00Z', description: 'Rent (shared house)', amount: 392.49, source: 'savings', type: 'expense', category: 'rent', impact: 'reduced' },
  { id: 'hist-nov21-openbank', createdAt: '2025-11-21T00:00:00Z', description: 'Transfer to OpenBank', amount: 360, source: 'savings', destination: 'openbank', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-nov21-openbank-manual', createdAt: '2025-11-21T00:00:00Z', description: 'Manual OpenBank deposit', amount: 230, destination: 'openbank', type: 'income', category: 'income', impact: 'increased' },
  { id: 'hist-nov21-cashapp', createdAt: '2025-11-21T00:00:00Z', description: 'CashApp load', amount: 180, source: 'checking', destination: 'cashApp', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-nov21-utilities', createdAt: '2025-11-21T00:00:00Z', description: 'Utilities (via CashApp)', amount: 100, source: 'cashApp', type: 'expense', category: 'other', customCategoryLabel: 'Utilities', impact: 'reduced' },
  { id: 'hist-nov21-groceries', createdAt: '2025-11-21T00:00:00Z', description: 'Groceries', amount: 100, source: 'cashApp', type: 'expense', category: 'groceries', impact: 'reduced' },
  { id: 'hist-nov21-bus', createdAt: '2025-11-21T00:00:00Z', description: 'Bus', amount: 50, source: 'cashApp', type: 'expense', category: 'transportation', impact: 'reduced' },
  { id: 'hist-nov21-toiletries', createdAt: '2025-11-21T00:00:00Z', description: 'Toiletries', amount: 30, source: 'cashApp', type: 'expense', category: 'other', customCategoryLabel: 'Toiletries', impact: 'reduced' },
  { id: 'hist-nov21-subs', createdAt: '2025-11-21T00:00:00Z', description: 'Subscriptions', amount: 12, source: 'checking', type: 'expense', category: 'subscriptions', impact: 'reduced' },

  // Dec 5
  { id: 'hist-dec5-rent', createdAt: '2025-12-05T00:00:00Z', description: 'Rent (shared house)', amount: 502.49, source: 'savings', type: 'expense', category: 'rent', impact: 'reduced' },
  { id: 'hist-dec5-quicksilver', createdAt: '2025-12-05T00:00:00Z', description: 'Quicksilver Credit Card', amount: 78, source: 'savings', type: 'expense', category: 'subscriptions', customCategoryLabel: 'Credit Card Payment', impact: 'reduced' },
  { id: 'hist-dec5-venture', createdAt: '2025-12-05T00:00:00Z', description: 'VentureOne Credit Card', amount: 175, source: 'savings', type: 'expense', category: 'subscriptions', customCategoryLabel: 'Credit Card Payment', impact: 'reduced' },
  { id: 'hist-dec5-cashapp', createdAt: '2025-12-05T00:00:00Z', description: 'CashApp load', amount: 150, source: 'checking', destination: 'cashApp', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-dec5-groceries', createdAt: '2025-12-05T00:00:00Z', description: 'Groceries', amount: 100, source: 'cashApp', type: 'expense', category: 'groceries', impact: 'reduced' },
  { id: 'hist-dec5-bus', createdAt: '2025-12-05T00:00:00Z', description: 'Bus', amount: 50, source: 'cashApp', type: 'expense', category: 'transportation', impact: 'reduced' },
  { id: 'hist-dec5-subs', createdAt: '2025-12-05T00:00:00Z', description: 'Subscriptions', amount: 16, source: 'checking', type: 'expense', category: 'subscriptions', impact: 'reduced' },

  // Dec 19
  { id: 'hist-dec19-rent', createdAt: '2025-12-19T00:00:00Z', description: 'Rent (shared house)', amount: 392.49, source: 'savings', type: 'expense', category: 'rent', impact: 'reduced' },
  { id: 'hist-dec19-openbank', createdAt: '2025-12-19T00:00:00Z', description: 'Transfer to OpenBank', amount: 360, source: 'savings', destination: 'openbank', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-dec19-openbank-manual', createdAt: '2025-12-19T00:00:00Z', description: 'Manual OpenBank deposit', amount: 250, destination: 'openbank', type: 'income', category: 'income', impact: 'increased' },
  { id: 'hist-dec19-cashapp', createdAt: '2025-12-19T00:00:00Z', description: 'CashApp load', amount: 180, source: 'checking', destination: 'cashApp', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-dec19-utilities', createdAt: '2025-12-19T00:00:00Z', description: 'Utilities (via CashApp)', amount: 100, source: 'cashApp', type: 'expense', category: 'other', customCategoryLabel: 'Utilities', impact: 'reduced' },
  { id: 'hist-dec19-groceries', createdAt: '2025-12-19T00:00:00Z', description: 'Groceries', amount: 100, source: 'cashApp', type: 'expense', category: 'groceries', impact: 'reduced' },
  { id: 'hist-dec19-bus', createdAt: '2025-12-19T00:00:00Z', description: 'Bus', amount: 50, source: 'cashApp', type: 'expense', category: 'transportation', impact: 'reduced' },
  { id: 'hist-dec19-toiletries', createdAt: '2025-12-19T00:00:00Z', description: 'Toiletries', amount: 30, source: 'cashApp', type: 'expense', category: 'other', customCategoryLabel: 'Toiletries', impact: 'reduced' },
  { id: 'hist-dec19-subs', createdAt: '2025-12-19T00:00:00Z', description: 'Subscriptions', amount: 12, source: 'checking', type: 'expense', category: 'subscriptions', impact: 'reduced' },

  // Feb 2026 - Jul 2026 Period (post-move)
  // Feb 13 (moving transition begins)
  { id: 'hist-feb13-rent', createdAt: '2026-02-13T00:00:00Z', description: 'Rent transfer (shared house)', amount: 392, source: 'savings', destination: 'rentFund', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-feb13-cashapp', createdAt: '2026-02-13T00:00:00Z', description: 'CashApp load', amount: 150, source: 'checking', destination: 'cashApp', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-feb13-groceries', createdAt: '2026-02-13T00:00:00Z', description: 'Groceries', amount: 100, source: 'cashApp', type: 'expense', category: 'groceries', impact: 'reduced' },
  { id: 'hist-feb13-bus', createdAt: '2026-02-13T00:00:00Z', description: 'Bus', amount: 50, source: 'cashApp', type: 'expense', category: 'transportation', impact: 'reduced' },
  { id: 'hist-feb13-spending', createdAt: '2026-02-13T00:00:00Z', description: 'Spending money (tracked)', amount: 330, source: 'checking', type: 'expense', category: 'other', customCategoryLabel: 'Spending', impact: 'reduced' },
  { id: 'hist-feb13-subs', createdAt: '2026-02-13T00:00:00Z', description: 'Subscriptions (Planet Fitness, Spotify)', amount: 29, source: 'checking', type: 'expense', category: 'subscriptions', impact: 'reduced' },

  // Feb 27
  { id: 'hist-feb27-rent', createdAt: '2026-02-27T00:00:00Z', description: 'Rent transfer (shared house)', amount: 500, source: 'savings', destination: 'rentFund', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-feb27-quicksilver', createdAt: '2026-02-27T00:00:00Z', description: 'Quicksilver Credit Card', amount: 78, source: 'savings', type: 'expense', category: 'subscriptions', customCategoryLabel: 'Credit Card Payment', impact: 'reduced' },
  { id: 'hist-feb27-openbank', createdAt: '2026-02-27T00:00:00Z', description: 'Transfer to OpenBank', amount: 360, source: 'savings', destination: 'openbank', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-feb27-cashapp', createdAt: '2026-02-27T00:00:00Z', description: 'CashApp load', amount: 120, source: 'checking', destination: 'cashApp', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-feb27-groceries', createdAt: '2026-02-27T00:00:00Z', description: 'Groceries', amount: 70, source: 'cashApp', type: 'expense', category: 'groceries', impact: 'reduced' },
  { id: 'hist-feb27-bus', createdAt: '2026-02-27T00:00:00Z', description: 'Bus', amount: 50, source: 'cashApp', type: 'expense', category: 'transportation', impact: 'reduced' },
  { id: 'hist-feb27-subs', createdAt: '2026-02-27T00:00:00Z', description: 'Subscriptions (Amazon)', amount: 16, source: 'checking', type: 'expense', category: 'subscriptions', impact: 'reduced' },

  // Apr 10 (first teaching paycheck)
  { id: 'hist-apr10-rent', createdAt: '2026-04-10T00:00:00Z', description: 'Rent (transition)', amount: 580, source: 'savings', destination: 'rentFund', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-apr10-venture', createdAt: '2026-04-10T00:00:00Z', description: 'VentureOne Credit Card', amount: 115, source: 'savings', type: 'expense', category: 'subscriptions', customCategoryLabel: 'Credit Card Payment', impact: 'reduced' },
  { id: 'hist-apr10-openbank', createdAt: '2026-04-10T00:00:00Z', description: 'Transfer to OpenBank', amount: 360, source: 'savings', destination: 'openbank', type: 'transfer', category: 'transfer', impact: 'neutral' },

  // Jun 5 (new apartment, stable rent at $600)
  { id: 'hist-jun5-rent', createdAt: '2026-06-05T00:00:00Z', description: 'Rent transfer (new apartment)', amount: 600, source: 'savings', destination: 'rentFund', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-jun5-venture', createdAt: '2026-06-05T00:00:00Z', description: 'VentureOne Credit Card', amount: 115, source: 'savings', type: 'expense', category: 'subscriptions', customCategoryLabel: 'Credit Card Payment', impact: 'reduced' },
  { id: 'hist-jun5-openbank', createdAt: '2026-06-05T00:00:00Z', description: 'Transfer to OpenBank', amount: 300, source: 'savings', destination: 'openbank', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-jun5-cashapp', createdAt: '2026-06-05T00:00:00Z', description: 'CashApp load', amount: 120, source: 'checking', destination: 'cashApp', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-jun5-groceries', createdAt: '2026-06-05T00:00:00Z', description: 'Groceries', amount: 70, source: 'cashApp', type: 'expense', category: 'groceries', impact: 'reduced' },
  { id: 'hist-jun5-bus', createdAt: '2026-06-05T00:00:00Z', description: 'Bus', amount: 50, source: 'cashApp', type: 'expense', category: 'transportation', impact: 'reduced' },
  { id: 'hist-jun5-subs', createdAt: '2026-06-05T00:00:00Z', description: 'Subscriptions (Planet Fitness, Spotify)', amount: 29, source: 'checking', type: 'expense', category: 'subscriptions', impact: 'reduced' },

  // Jun 19 (current period at time of export)
  { id: 'hist-jun19-rent', createdAt: '2026-06-19T00:00:00Z', description: 'Rent transfer', amount: 600, source: 'savings', destination: 'rentFund', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-jun19-quicksilver', createdAt: '2026-06-19T00:00:00Z', description: 'Quicksilver Credit Card', amount: 100, source: 'savings', type: 'expense', category: 'subscriptions', customCategoryLabel: 'Credit Card Payment', impact: 'reduced' },
  { id: 'hist-jun19-utilities', createdAt: '2026-06-19T00:00:00Z', description: 'Utilities', amount: 100, source: 'savings', type: 'expense', category: 'other', customCategoryLabel: 'Utilities', impact: 'reduced' },
  { id: 'hist-jun19-stupidpets', createdAt: '2026-06-19T00:00:00Z', description: 'Stupid pets52', amount: 5.99, source: 'savings', type: 'expense', category: 'subscriptions', customCategoryLabel: 'Pet Care', impact: 'reduced' },
  { id: 'hist-jun19-petins', createdAt: '2026-06-19T00:00:00Z', description: 'Pet Insurance', amount: 25.07, source: 'savings', type: 'expense', category: 'subscriptions', customCategoryLabel: 'Insurance', impact: 'reduced' },
  { id: 'hist-jun19-openbank', createdAt: '2026-06-19T00:00:00Z', description: 'Transfer to OpenBank', amount: 300, source: 'savings', destination: 'openbank', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-jun19-cashapp', createdAt: '2026-06-19T00:00:00Z', description: 'CashApp load (groceries only, no bus)', amount: 70, source: 'checking', destination: 'cashApp', type: 'transfer', category: 'transfer', impact: 'neutral' },
  { id: 'hist-jun19-groceries', createdAt: '2026-06-19T00:00:00Z', description: 'Groceries', amount: 70, source: 'cashApp', type: 'expense', category: 'groceries', impact: 'reduced' },
  { id: 'hist-jun19-subs', createdAt: '2026-06-19T00:00:00Z', description: 'Subscriptions (Amazon)', amount: 16, source: 'checking', type: 'expense', category: 'subscriptions', impact: 'reduced' },
]

export const historicalPayPeriods: PayPeriod[] = [
  // Oct 2025 - Jan 2026 (IDs: -19 to -14)
  { id: -19, label: 'Oct 10, 2025', payDate: '2025-10-10', payAmount: 2330.64, transfers: { rent: 394.98, openbank: 500 } },
  { id: -18, label: 'Oct 24, 2025', payDate: '2025-10-24', payAmount: 1380, transfers: { rent: 502, openbank: 360 } },
  { id: -17, label: 'Nov 7, 2025', payDate: '2025-11-07', payAmount: 1380, transfers: { rent: 502.49, openbank: 0 } },
  { id: -16, label: 'Nov 21, 2025', payDate: '2025-11-21', payAmount: 1380, transfers: { rent: 392.49, openbank: 360 } },
  { id: -15, label: 'Dec 5, 2025', payDate: '2025-12-05', payAmount: 1448, transfers: { rent: 502.49, openbank: 0 } },
  { id: -14, label: 'Dec 19, 2025', payDate: '2025-12-19', payAmount: 1448.71, transfers: { rent: 392.49, openbank: 360 } },

  // Feb 2026 - Jul 2026 (IDs: -13 to 0)
  { id: -13, label: 'Feb 13, 2026', payDate: '2026-02-13', payAmount: 0, transfers: { rent: 392, openbank: 0 } },
  { id: -12, label: 'Feb 27, 2026', payDate: '2026-02-27', payAmount: 0, transfers: { rent: 500, openbank: 360 } },
  { id: -11, label: 'Mar 13, 2026', payDate: '2026-03-13', payAmount: 0, transfers: { rent: 392, openbank: 360 } },
  { id: -10, label: 'Mar 27, 2026', payDate: '2026-03-27', payAmount: 0, transfers: { rent: 500, openbank: 360 } },
  { id: -9, label: 'Apr 10, 2026', payDate: '2026-04-10', payAmount: 1454, transfers: { rent: 580, openbank: 360 } },
  { id: -8, label: 'Apr 24, 2026', payDate: '2026-04-24', payAmount: 1454, transfers: { rent: 0, openbank: 0 } },
  { id: -7, label: 'May 8, 2026', payDate: '2026-05-08', payAmount: 1454, transfers: { rent: 0, openbank: 585 } },
  { id: -6, label: 'May 22, 2026', payDate: '2026-05-22', payAmount: 1454, transfers: { rent: 0, openbank: 585 } },
  { id: -5, label: 'Jun 5, 2026', payDate: '2026-06-05', payAmount: 1454, transfers: { rent: 600, openbank: 300 } },
  { id: -4, label: 'Jun 19, 2026', payDate: '2026-06-19', payAmount: 1454, transfers: { rent: 600, openbank: 300 } },
  { id: -3, label: 'Jul 3, 2026', payDate: '2026-07-03', payAmount: 1454, transfers: { rent: 600, openbank: 300 } },
  { id: -2, label: 'Jul 17, 2026', payDate: '2026-07-17', payAmount: 1454, transfers: { rent: 600, openbank: 300 } },
]
