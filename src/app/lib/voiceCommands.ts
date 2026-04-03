export interface VoiceExpenseResult {
  description: string;
  amount?: string;
  category?: string;
  paymentMethod?: string;
  date?: string;
  notes?: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': ['food', 'restaurant', 'cafe', 'coffee', 'dinner', 'lunch', 'breakfast', 'snack', 'swiggy', 'zomato', 'pizza', 'burger', 'chai'],
  'Transportation': ['uber', 'ola', 'rapido', 'taxi', 'cab', 'ride', 'bus', 'metro', 'train', 'fuel', 'petrol', 'diesel', 'parking'],
  'Shopping': ['shop', 'shopping', 'grocery', 'groceries', 'mall', 'amazon', 'flipkart', 'myntra', 'clothes', 'shoes'],
  'Bills & Utilities': ['bill', 'electricity', 'water', 'gas', 'internet', 'broadband', 'recharge', 'mobile', 'dth', 'utility'],
  'Entertainment': ['movie', 'cinema', 'netflix', 'prime', 'hotstar', 'spotify', 'game', 'concert'],
  'Healthcare': ['hospital', 'pharmacy', 'doctor', 'clinic', 'medicine', 'medical', 'health', 'gym', 'fitness'],
  'Education': ['course', 'class', 'school', 'college', 'udemy', 'coursera', 'book', 'tuition'],
};

const PAYMENT_METHOD_KEYWORDS: Record<string, string[]> = {
  'UPI': ['upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'bhim', 'upi transfer'],
  'Credit Card': ['credit', 'credit card', 'card credit'],
  'Debit Card': ['debit', 'debit card', 'card debit'],
  'Net Banking': ['net banking', 'netbanking', 'bank transfer', 'neft', 'rtgs', 'imps'],
  'Wallet': ['wallet', 'amazon pay', 'paytm wallet'],
  'Cash': ['cash', 'cash payment'],
};

function normalizeAmount(value: string): string {
  return value.replace(/,/g, '');
}

function extractAmount(text: string): string | undefined {
  const currencyMatch = text.match(/(?:₹|rs\.?|inr|usd|\$|dollars?|bucks?)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (currencyMatch?.[1]) return normalizeAmount(currencyMatch[1]);
  const genericMatch = text.match(/\b([\d,]+(?:\.\d{1,2})?)\b/);
  if (genericMatch?.[1]) return normalizeAmount(genericMatch[1]);
  return undefined;
}

function detectCategory(text: string): string | undefined {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return category;
  }
  return undefined;
}

function detectPaymentMethod(text: string): string | undefined {
  for (const [method, keywords] of Object.entries(PAYMENT_METHOD_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return method;
  }
  return undefined;
}

function parseNumericDate(value: string): Date | null {
  const parts = value.includes('/') ? value.split('/') : value.split('-');
  if (parts.length !== 3) return null;
  const [p1, p2, p3] = parts.map(p => parseInt(p, 10));
  if ([p1, p2, p3].some(n => Number.isNaN(n))) return null;

  let year = p3;
  let month = p2;
  let day = p1;

  if (p1 > 31 || p2 > 31) return null;
  if (p3 < 100) year = 2000 + p3;

  // Heuristic: if first part > 12, treat as DD/MM/YYYY, else assume MM/DD/YYYY
  if (p1 <= 12 && p2 > 12) {
    month = p1;
    day = p2;
  } else if (p1 <= 12 && p2 <= 12) {
    // ambiguous; default to locale-style DD/MM for India + most global
    day = p1;
    month = p2;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMonthNameDate(text: string): Date | null {
  const months: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  const match = text.match(/\b(\d{1,2})\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = months[match[2]];
    if (Number.isNaN(day) || month === undefined) return null;
    const year = new Date().getFullYear();
    return new Date(year, month, day);
  }

  const reverse = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{1,2})\b/);
  if (reverse) {
    const day = parseInt(reverse[2], 10);
    const month = months[reverse[1]];
    if (Number.isNaN(day) || month === undefined) return null;
    const year = new Date().getFullYear();
    return new Date(year, month, day);
  }

  return null;
}

function parseRelativeDate(text: string): Date | null {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('day before yesterday')) {
    const d = new Date(now);
    d.setDate(now.getDate() - 2);
    return d;
  }
  if (lower.includes('yesterday')) {
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    return d;
  }
  if (lower.includes('today')) {
    return now;
  }

  const weekdayMatch = lower.match(/\b(last|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (weekdayMatch) {
    const target = weekdayMatch[2];
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const targetIdx = days.indexOf(target);
    const currentIdx = now.getDay();
    let diff = currentIdx - targetIdx;
    if (weekdayMatch[1] === 'last') {
      if (diff <= 0) diff += 7;
    } else {
      if (diff < 0) diff += 7;
    }
    const d = new Date(now);
    d.setDate(now.getDate() - diff);
    return d;
  }

  return null;
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseVoiceExpense(text: string): VoiceExpenseResult {
  const original = text.trim();
  const lower = original.toLowerCase();

  const amount = extractAmount(lower);
  const category = detectCategory(lower);
  const paymentMethod = detectPaymentMethod(lower);

  let date: string | undefined;
  const numericMatch = lower.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b/);
  if (numericMatch) {
    const parsed = parseNumericDate(numericMatch[0]);
    if (parsed) date = toISODate(parsed);
  }
  if (!date) {
    const parsedMonth = parseMonthNameDate(lower);
    if (parsedMonth) date = toISODate(parsedMonth);
  }
  if (!date) {
    const relative = parseRelativeDate(lower);
    if (relative) date = toISODate(relative);
  }

  let description = original;
  description = description.replace(/\b(add|log|record|spent|paid|bought|purchase|purchased|expense)\b/gi, '').trim();
  const tailMatch = description.match(/(?:for|on|at|to)\s+(.+)$/i);
  if (tailMatch?.[1]) description = tailMatch[1];

  if (amount) {
    description = description.replace(amount, '').trim();
  }
  description = description.replace(/\b(rupees?|rs\.?|inr|usd|\$|dollars?|bucks?)\b/gi, '').trim();
  if (paymentMethod) {
    const keywords = PAYMENT_METHOD_KEYWORDS[paymentMethod] || [];
    keywords.forEach((kw) => { description = description.replace(new RegExp(kw, 'ig'), '').trim(); });
  }
  if (description.length < 3) description = original;

  return {
    description,
    amount,
    category,
    paymentMethod,
    date,
  };
}
