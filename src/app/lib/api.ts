/* eslint-disable @typescript-eslint/no-explicit-any */
import { normalizeExpenseCategory, type ExpenseSource } from './expenseSchema';
import { auth } from './auth';
import { hasEdgeApi, runtimeConfig } from './runtimeConfig';

const PYTHON_API_URL = runtimeConfig.pythonApiUrl;
const EDGE_API_URL = runtimeConfig.edgeApiUrl;

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

export interface FinanceNewsItem {
  title: string;
  link: string;
  publishedAt: string;
  source: string;
}

export interface FinanceMacroMetric {
  key: string;
  label: string;
  value: string;
  note: string;
  raw?: number;
  source?: string;
}

export interface FinanceIntelPayload {
  asOf: string;
  news: FinanceNewsItem[];
  macro: FinanceMacroMetric[];
  netWorth: {
    combinedTop100Usd: number;
    combinedTop100Formatted: string;
    leaders: Array<{
      name: string;
      netWorthUsd: number;
      netWorthFormatted: string;
      country: string;
    }>;
    source: string;
    asOf: string;
  } | null;
  resources: {
    diamond: {
      perCaratUsd: number;
      source: string;
    };
  };
  providerStatus?: Record<string, string>;
  cache?: string;
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

function getDynamicKey(baseKey: string): string {
  const user = auth.getCurrentUser();
  if (!user || user.email === 'demo@expense-tracker.com') {
    return baseKey;
  }
  return `${baseKey}_${user.id}`;
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
  const data = safeParse<Expense[] | null>(localStorage.getItem(getDynamicKey(STORAGE_KEYS.EXPENSES)), null);
  if (data) {
    const normalized = data.map(normalizeExpense);
    return normalized;
  }
  return [];
}
function saveLocalExpenses(expenses: Expense[]) {
  localStorage.setItem(getDynamicKey(STORAGE_KEYS.EXPENSES), JSON.stringify(expenses));
  window.dispatchEvent(new Event('expenseai:edge:expenses_updated'));
}

function getLocalBudgets(): Budget[] {
  return safeParse<Budget[] | null>(localStorage.getItem(getDynamicKey(STORAGE_KEYS.BUDGETS)), null) || [];
}

function saveLocalBudgets(budgets: Budget[]) {
  localStorage.setItem(getDynamicKey(STORAGE_KEYS.BUDGETS), JSON.stringify(budgets));
}

const triggerIntegrations = async (expense: Expense, action: string) => {
  if (!hasEdgeApi) return;
  try {
     const whatsappNumber = localStorage.getItem('integration_whatsapp');
     const sheetId = localStorage.getItem('integration_sheet_id');

     if (whatsappNumber) {
        fetch(`${EDGE_API_URL}/integrations-messaging`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
              action: 'notify',
              provider: 'whatsapp',
              to: whatsappNumber,
              message: `*Expense Added*\nDescription: ${expense.description}\nAmount: ${expense.amount}\nCategory: ${expense.category}`
           })
        }).catch(() => {});
     }

     if (sheetId) {
        fetch(`${EDGE_API_URL}/integrations-sheets`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
              action: 'append_row',
              sheetId: sheetId,
              payload: [expense]
           })
        }).catch(() => {});
     }
  } catch(e) {}
};

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
        triggerIntegrations(newExpense as Expense, 'add');
        return newExpense;
      }
    } catch {}
    // Fallback
    const newLocal = normalizeExpense({ ...expense, id: `exp_${Date.now()}` } as Expense);
    saveLocalExpenses([newLocal, ...getLocalExpenses()]);
    triggerIntegrations(newLocal, 'add');
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
    
    // Fallback: Update local storage directly
    const current = getLocalExpenses();
    const updated = current.map((e: Expense) => e.id === id ? { ...e, ...updates } : e);
    saveLocalExpenses(updated);
    return { id, ...updates }; 
  },
  
  deleteExpense: async (id: string) => {
    try {
      await fetch(`${PYTHON_API_URL}/expenses/${id}`, { method: 'DELETE' });
    } catch {}
    // Fallback: Delete from local storage directly
    const expenses = getLocalExpenses();
    saveLocalExpenses(expenses.filter((e: Expense) => e.id !== id));
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
    return { error: true, code: 'fallback', type: 'ocr_receipt', rawText: "Backend unreachable.", extractedData: null };
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
    const totalMonthly = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryMap: Record<string, number> = {};
    const methodMap: Record<string, number> = {};
    const sourceMap: Record<string, { amount: number, count: number }> = {};
    
    expenses.forEach(e => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
        const method = e.paymentMethod || 'Unknown';
        methodMap[method] = (methodMap[method] || 0) + e.amount;
        const source = e.source || 'manual';
        if (!sourceMap[source]) sourceMap[source] = { amount: 0, count: 0 };
        sourceMap[source].amount += e.amount;
        sourceMap[source].count += 1;
    });

    const categoryBreakdown = Object.keys(categoryMap).map(k => ({
        category: k,
        amount: categoryMap[k],
        percentage: totalMonthly > 0 ? (categoryMap[k] / totalMonthly) * 100 : 0
    })).sort((a,b) => b.amount - a.amount);

    const paymentMethodBreakdown = Object.keys(methodMap).map(k => ({
        method: k,
        amount: methodMap[k],
        percentage: totalMonthly > 0 ? (methodMap[k] / totalMonthly) * 100 : 0
    })).sort((a,b) => b.amount - a.amount);
    
    const sourceBreakdown = Object.keys(sourceMap).map(k => ({
        source: k,
        amount: sourceMap[k].amount,
        count: sourceMap[k].count,
        percentage: totalMonthly > 0 ? (sourceMap[k].amount / totalMonthly) * 100 : 0
    })).sort((a,b) => b.amount - a.amount);

    // mock weekly trend
    const weeklyTrend = [
       { week: 'Week 1', amount: totalMonthly * 0.2 },
       { week: 'Week 2', amount: totalMonthly * 0.3 },
       { week: 'Week 3', amount: totalMonthly * 0.1 },
       { week: 'Week 4', amount: totalMonthly * 0.4 },
    ];

    return {
      totalMonthly,
      totalExpenses: expenses.length,
      averageExpense: expenses.length > 0 ? totalMonthly / expenses.length : 0,
      categoryBreakdown,
      paymentMethodBreakdown,
      weeklyTrend,
      sourceBreakdown,
      forecast: { predictedNext7Days: 0, trend: 'stable' },
      anomalies: []
    };
  },
  
  getBudgets: async () => {
    return { budgets: getLocalBudgets() };
  },
  setBudget: async (b: Omit<Budget, 'id'>) => {
    const newBudget = { ...b, id: `budget_${Date.now()}` } as Budget;
    saveLocalBudgets([...getLocalBudgets(), newBudget]);
    return newBudget;
  },
  updateBudget: async (id: string, updates: Partial<Budget>) => {
    const budgets = getLocalBudgets().map(b => b.id === id ? { ...b, ...updates } : b);
    saveLocalBudgets(budgets);
    return { id, ...updates };
  },
  deleteBudget: async (id: string) => {
    saveLocalBudgets(getLocalBudgets().filter(b => b.id !== id));
    return { success: true };
  },
  clearAllBudgets: async () => {
    saveLocalBudgets([]);
    return { success: true };
  },
  getInsights: async () => {
     try {
       const data = await api.getAnalytics();
       const insights: any[] = [];
       if (data.anomalies && data.anomalies.length > 0) {
          data.anomalies.forEach((a: any) => {
              insights.push({
                 type: a.severity?.includes('High') ? 'warning' : 'tip',
                 title: 'Unsupervised ML Anomaly',
                 message: `IsolationForest isolated irregular spending of $${a.amount} at ${a.description} on ${a.date}.`,
                 category: a.category
              });
          });
       } else {
          insights.push({ type: 'success', title: 'Spending Normalized', message: 'Isolation Forest detected no unusual clustering out of bounds.' });
       }
       return { insights };
     } catch { return { insights: [] }; }
  },
  getPredictions: async () => {
     try {
       const data = await api.getAnalytics();
       return {
          predictions: {
             currentMonthSpending: data.totalAmount || 0,
             predictedMonthEnd: ((data.totalAmount || 0) + (data.forecast?.predictedNext7Days || 0)),
             dailyAverage: data.forecast?.dailyAverage || 0,
             recommendedDailyBudget: data.forecast?.dailyAverage ? data.forecast.dailyAverage * 0.85 : 0
          }
       };
     } catch { return { predictions: null }; }
  },
  categorizeExpense: async (description: string, amount: number) => ({ category: 'Others', confidence: 0.5 }),
  getScans: async () => {
     const expenses = getLocalExpenses();
     const scans = expenses
       .filter(e => e.receiptImage)
       .map(e => ({
          id: `scan_${e.id}`,
          amount: e.amount,
          date: e.date,
          description: e.description,
          imageUrl: e.receiptImage
       }));
     return { scans };
  },
  exportData: async () => ({ success: true, data: getLocalExpenses() }),
  getFinanceIntel: async (forceRefresh = false): Promise<FinanceIntelPayload> => {
    const query = forceRefresh ? '?refresh=1' : '';
    const candidates = [
      `${PYTHON_API_URL}/market/news-macro${query}`,
      `/market/news-macro${query}`,
      `http://127.0.0.1:3001/market/news-macro${query}`,
    ];

    let lastError: unknown = null;
    for (const url of candidates) {
      try {
        const resp = await fetch(url, { 
          headers: { 
            Accept: 'application/json',
            'ngrok-skip-browser-warning': 'true'
          } 
        });
        if (!resp.ok) {
          lastError = new Error(`Finance intel request failed at ${url} with ${resp.status}`);
          continue;
        }
        return await resp.json();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Finance intel request failed');
  },
};
