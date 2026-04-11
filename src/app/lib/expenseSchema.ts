export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Investments & Savings',
  'Travel & Holidays',
  'Others',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ExpenseSource =
  | 'manual'
  | 'voice'
  | 'receipt_scan'
  | 'qr_scan'
  | 'barcode_scan'
  | 'stock_trade'
  | 'forex_trade'
  | 'crypto_trade'
  | 'import'
  | 'automation';

const CATEGORY_ALIASES: Record<string, ExpenseCategory> = {
  'food': 'Food & Dining',
  'food and dining': 'Food & Dining',
  'food & dining': 'Food & Dining',
  'transport': 'Transportation',
  'transportation': 'Transportation',
  'shopping': 'Shopping',
  'bills': 'Bills & Utilities',
  'bills and utilities': 'Bills & Utilities',
  'bills & utilities': 'Bills & Utilities',
  'utilities': 'Bills & Utilities',
  'entertainment': 'Entertainment',
  'health': 'Healthcare',
  'healthcare': 'Healthcare',
  'education': 'Education',
  'investments': 'Investments & Savings',
  'investments & savings': 'Investments & Savings',
  'investments and savings': 'Investments & Savings',
  'trading': 'Investments & Savings',
  'travel': 'Travel & Holidays',
  'travel & holidays': 'Travel & Holidays',
  'travel and holidays': 'Travel & Holidays',
  'others': 'Others',
};

export function normalizeExpenseCategory(input?: string): ExpenseCategory {
  if (!input) return 'Others';
  const trimmed = input.trim();
  const exact = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  const alias = CATEGORY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  return 'Others';
}
