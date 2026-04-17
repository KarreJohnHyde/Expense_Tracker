/* eslint-disable @typescript-eslint/no-explicit-any */
import { normalizeExpenseCategory, type ExpenseSource } from './expenseSchema';

const _meta = (import.meta as any).env || {};
const PYTHON_API_URL = (_meta.VITE_PYTHON_API_URL as string) || 'http://127.0.0.1:3000';
const EDGE_API_URL = (_meta.VITE_API_URL as string) || 'https://yghrnwlwfdadlnzhqhdp.supabase.co/functions/v1';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod?: string;
  tags?: string[];
  location?: string;
  receiptImage?: string | null;
  source?: ExpenseSource;
  scanData?: {
    type: 'ocr_receipt' | 'qr' | 'barcode';
    rawText: string;
    format?: string;
    capturedAt: string;
  } | null;
  metadata?: Record<string, any>;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: string;
}

// Simulated Fallbacks
const STORAGE_KEYS = {
  EXPENSES: 'expenseai_expenses',
  BUDGETS: 'expenseai_budgets'
};

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeExpense(expense: Expense): Expense {
  return {
    ...expense,
    amount: Number.isFinite(expense.amount) ? expense.amount : parseFloat(String(expense.amount || 0)),
    category: normalizeExpenseCategory(expense.category),
    paymentMethod: expense.paymentMethod || 'Cash',
    source: expense.source || 'manual',
    receiptImage: expense.receiptImage || null,
    scanData: expense.scanData || null,
  };
}

function getLocalExpenses(): Expense[] {
  const data = safeParse<Expense[] | null>(localStorage.getItem(STORAGE_KEYS.EXPENSES), null);
  if (data) {
    const normalized = data.map(normalizeExpense);
    return normalized;
  }
  return [];
}
function saveLocalExpenses(expenses: Expense[]) {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  window.dispatchEvent(new Event('expenseai:edge:expenses_updated'));
}

export const api = {
  getExpenses: async () => {
    try {
      const resp = await fetch(`${PYTHON_API_URL}/expenses`);
      if (resp.ok) {
        const data = await resp.json();
        return { expenses: data.expenses.map(normalizeExpense) };
      }
    } catch {}
    // Fallback
    return { expenses: getLocalExpenses() };
  },
  
  addExpense: async (expense: Omit<Expense, 'id'>) => {
    try {
      const resp = await fetch(`${PYTHON_API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense),
      });
      if (resp.ok) {
        const newExpense = await resp.json();
        saveLocalExpenses([normalizeExpense(newExpense as Expense), ...getLocalExpenses()]);
        return newExpense;
      }
    } catch {}
    // Fallback
    const newLocal = normalizeExpense({ ...expense, id: `exp_${Date.now()}` } as Expense);
    saveLocalExpenses([newLocal, ...getLocalExpenses()]);
    return newLocal;
  },
  
  updateExpense: async (id: string, updates: Partial<Expense>) => {
    try {
      const resp = await fetch(`${PYTHON_API_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch {}
    return { id, ...updates }; // Stub
  },
  
  deleteExpense: async (id: string) => {
    try {
      await fetch(`${PYTHON_API_URL}/expenses/${id}`, { method: 'DELETE' });
    } catch {}
    const expenses = getLocalExpenses();
    saveLocalExpenses(expenses.filter(e => e.id !== id));
    return { success: true };
  },

  // ── Mod 1: Image Processing logic connected to Python Backend ─────────
  processReceipt: async (imageBase64: string) => {
    try {
      const res = await fetch(`${PYTHON_API_URL}/ai/scan-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { type: 'ocr_receipt', rawText: "Backend unreachable.", extractedData: null };
  },

  // ── Mod 2: Image Storage Management to S3 Bucket via Python ──────────
  uploadImage: async (file: File, expenseId: string): Promise<{ url: string; size: number; id: string }> => {
    try {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          try {
            const resp = await fetch(`${PYTHON_API_URL}/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: dataUrl })
            });
            if (resp.ok) {
              const data = await resp.json();
              resolve({ url: data.url, size: file.size, id: data.id });
            } else {
              // local fallback
              const id = `img_${Date.now()}`;
              localStorage.setItem(`receipt_${id}`, dataUrl);
              resolve({ url: dataUrl, size: file.size, id });
            }
          } catch {
             const id = `img_${Date.now()}`;
             localStorage.setItem(`receipt_${id}`, dataUrl);
             resolve({ url: dataUrl, size: file.size, id });
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    } catch {
      throw new Error('Upload error');
    }
  },

  getAnalytics: async () => {
    try {
      const res = await fetch(`${PYTHON_API_URL}/ai/analytics`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    
    // Fallback analytics
    const expenses = getLocalExpenses();
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      totalMonthly: totalExpenses,
      categoryBreakdown: [],
      forecast: { predictedNext7Days: 0, trend: 'stable' },
      anomalies: []
    };
  },
  
  // Stubs for remaining functions
  getBudgets: async () => ({ budgets: [] }),
  setBudget: async (b: any) => b,
  updateBudget: async (id: string, updates: any) => ({...updates, id}),
  deleteBudget: async (id: string) => ({success: true}),
  clearAllBudgets: async () => ({success: true}),
  getInsights: async () => ({ insights: [] }),
  categorizeExpense: async () => ({ category: 'Others', confidence: 0.5 }),
  exportData: async () => ({ success: true, data: getLocalExpenses() }),
};
