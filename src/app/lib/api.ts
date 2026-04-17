// Supabase Edge Function API
/* eslint-disable @typescript-eslint/no-explicit-any */
import { normalizeExpenseCategory, type ExpenseSource } from './expenseSchema';

const _meta = (import.meta as any).env || {};

const API_URL = (_meta.VITE_API_URL as string) || 'https://yghrnwlwfdadlnzhqhdp.supabase.co/functions/v1';


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

// ── Demo Data ─────────────────────────────────────────────────────────
function generateDemoExpenses(): Expense[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  return [
    { id: 'demo-1', description: 'Swiggy Food Order', amount: 450, category: 'Food & Dining', date: new Date(y, m, 1).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-2', description: 'Uber Ride to Office', amount: 280, category: 'Transportation', date: new Date(y, m, 2).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-3', description: 'Amazon Electronics', amount: 3999, category: 'Shopping', date: new Date(y, m, 3).toISOString(), paymentMethod: 'Credit Card' },
    { id: 'demo-4', description: 'Electricity Bill', amount: 2100, category: 'Bills & Utilities', date: new Date(y, m, 4).toISOString(), paymentMethod: 'Net Banking' },
    { id: 'demo-5', description: 'Netflix Subscription', amount: 649, category: 'Entertainment', date: new Date(y, m, 5).toISOString(), paymentMethod: 'Debit Card' },
    { id: 'demo-6', description: 'Apollo Pharmacy', amount: 870, category: 'Healthcare', date: new Date(y, m, 6).toISOString(), paymentMethod: 'Cash' },
    { id: 'demo-7', description: 'Udemy Course', amount: 499, category: 'Education', date: new Date(y, m, 7).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-8', description: 'Cafe Coffee Day', amount: 320, category: 'Food & Dining', date: new Date(y, m, 8).toISOString(), paymentMethod: 'Cash' },
    { id: 'demo-9', description: 'Petrol Fill-up', amount: 1500, category: 'Transportation', date: new Date(y, m, 9).toISOString(), paymentMethod: 'Debit Card' },
    { id: 'demo-10', description: 'Myntra Clothing', amount: 2450, category: 'Shopping', date: new Date(y, m, 10).toISOString(), paymentMethod: 'Credit Card' },
    { id: 'demo-11', description: 'Mobile Recharge', amount: 599, category: 'Bills & Utilities', date: new Date(y, m, 11).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-12', description: 'Movie Tickets – PVR', amount: 750, category: 'Entertainment', date: new Date(y, m, 12).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-13', description: 'Zomato Dinner', amount: 890, category: 'Food & Dining', date: new Date(y, m, 14).toISOString(), paymentMethod: 'Credit Card' },
    { id: 'demo-14', description: 'Gym Membership', amount: 3000, category: 'Healthcare', date: new Date(y, m, 15).toISOString(), paymentMethod: 'Net Banking' },
    { id: 'demo-15', description: 'Ola Auto Ride', amount: 120, category: 'Transportation', date: new Date(y, m, 16).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-16', description: 'Flipkart Phone Case', amount: 399, category: 'Shopping', date: new Date(y, m, 18).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-17', description: 'Water Bill', amount: 450, category: 'Bills & Utilities', date: new Date(y, m, 20).toISOString(), paymentMethod: 'Net Banking' },
    { id: 'demo-18', description: 'Coursera Subscription', amount: 1200, category: 'Education', date: new Date(y, m, 22).toISOString(), paymentMethod: 'Credit Card' },
    { id: 'demo-19', description: 'Grocery – BigBasket', amount: 1850, category: 'Food & Dining', date: new Date(y, m, 24).toISOString(), paymentMethod: 'Debit Card' },
    { id: 'demo-20', description: 'Metro Card Recharge', amount: 500, category: 'Transportation', date: new Date(y, m, 25).toISOString(), paymentMethod: 'UPI' },
  ];
}

function generateDemoBudgets(): Budget[] {
  return [
    { id: 'bud-1', category: 'Food & Dining', amount: 8000, period: 'monthly' },
    { id: 'bud-2', category: 'Transportation', amount: 5000, period: 'monthly' },
    { id: 'bud-3', category: 'Shopping', amount: 10000, period: 'monthly' },
    { id: 'bud-4', category: 'Bills & Utilities', amount: 6000, period: 'monthly' },
    { id: 'bud-5', category: 'Entertainment', amount: 3000, period: 'monthly' },
    { id: 'bud-6', category: 'Healthcare', amount: 5000, period: 'monthly' },
    { id: 'bud-7', category: 'Education', amount: 4000, period: 'monthly' },
  ];
}

function generateDemoInsights() {
  return {
    insights: [
      {
        type: 'warning',
        title: 'High Food Spending',
        message: 'Your food & dining expenses are 20% above your monthly average. Consider meal-prepping to save money.',
        category: 'Food & Dining',
        amount: 3510,
        potentialSavings: 1200,
      },
      {
        type: 'tip',
        title: 'Switch to Public Transport',
        message: 'You could save ₹1,500/month by using metro instead of ride-hailing apps for your daily commute.',
        category: 'Transportation',
        potentialSavings: 1500,
      },
      {
        type: 'success',
        title: 'Bills Under Control',
        message: 'Great job! Your utility bills are 15% below budget this month.',
        category: 'Bills & Utilities',
      },
      {
        type: 'saving',
        title: 'Subscription Audit',
        message: 'You have ₹1,849 in recurring subscriptions. Review if all are being used.',
        potentialSavings: 649,
      },
    ],
  };
}

function generateDemoPredictions() {
  return {
    predictions: {
      currentMonthSpending: 22826,
      predictedMonthEnd: 31500,
      dailyAverage: 1141,
      recommendedDailyBudget: 850,
    },
  };
}

// ── Simulated Edge Operations (Local Storage Backed) ────────────────────
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

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(normalized));
    return normalized;
  }
  const demo = generateDemoExpenses();
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(demo));
  return demo;
}

function saveLocalExpenses(expenses: Expense[]) {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  // Simulate an edge event trigger
  window.dispatchEvent(new Event('expenseai:edge:expenses_updated'));
}

function getLocalBudgets(): Budget[] {
  const data = safeParse<Budget[] | null>(localStorage.getItem(STORAGE_KEYS.BUDGETS), null);
  if (data) return data;
  const demo = generateDemoBudgets();
  localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(demo));
  return demo;
}

function saveLocalBudgets(budgets: Budget[]) {
  localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  window.dispatchEvent(new Event('expenseai:edge:budgets_updated'));
}

export const api = {
  // Expenses (Simulated Edge)
  getExpenses: async () => ({ expenses: getLocalExpenses() }),
  addExpense: async (expense: Omit<Expense, 'id'>) => {
    const expenses = getLocalExpenses();
    const newExpense = normalizeExpense({
      ...expense,
      id: makeId('exp'),
      date: expense.date || new Date().toISOString().split('T')[0],
      source: expense.source || 'manual',
    } as Expense);
    saveLocalExpenses([newExpense, ...expenses]);
    return newExpense;
  },
  updateExpense: async (id: string, updates: Partial<Expense>) => {
    const expenses = getLocalExpenses();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx > -1) {
      expenses[idx] = normalizeExpense({ ...expenses[idx], ...updates });
      saveLocalExpenses(expenses);
      return expenses[idx];
    }
    throw new Error('Expense not found');
  },
  deleteExpense: async (id: string) => {
    const expenses = getLocalExpenses();
    saveLocalExpenses(expenses.filter(e => e.id !== id));
    return { success: true };
  },

  // Budgets (Simulated Edge)
  getBudgets: async () => ({ budgets: getLocalBudgets() }),
  setBudget: async (budget: Omit<Budget, 'id'>) => {
    const budgets = getLocalBudgets();
    const newBudget = { ...budget, id: `bud_${Date.now()}` };
    saveLocalBudgets([...budgets, newBudget]);
    return newBudget;
  },
  updateBudget: async (id: string, updates: Partial<Budget>) => {
    const budgets = getLocalBudgets();
    const idx = budgets.findIndex(b => b.id === id);
    if (idx > -1) {
      budgets[idx] = { ...budgets[idx], ...updates };
      saveLocalBudgets(budgets);
      return budgets[idx];
    }
    throw new Error('Budget not found');
  },
  deleteBudget: async (id: string) => {
    const budgets = getLocalBudgets();
    saveLocalBudgets(budgets.filter(b => b.id !== id));
    return { success: true };
  },
  clearAllBudgets: async () => {
    saveLocalBudgets([]);
    return { success: true };
  },

  // AI/ML (Fallback to Demo/Local logic as these run purely client-side or mocked now)
  categorizeExpense: async (description: string, amount: number) => {
    try {
      const res = await fetch(`${API_URL}/smart-categorizer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'categorize', description, amount }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.category) {
          return {
            category: normalizeExpenseCategory(data.category),
            confidence: Number(data.confidence || 0),
            source: 'edge',
            matchedKeywords: data.matchedKeywords || [],
          };
        }
      }
    } catch {
      // fallback
    }
    return { category: 'Others', confidence: 0.5, source: 'local-fallback', matchedKeywords: [] };
  },
  getPredictions: async () => {
    const expenses = getLocalExpenses();
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const dailyAverage = expenses.length > 0 ? total / expenses.length : 0;
    return {
      predictions: {
        currentMonthSpending: total,
        predictedMonthEnd: total + (dailyAverage * 10), // arbitrary forecast
        dailyAverage: Math.round(dailyAverage),
        recommendedDailyBudget: Math.max(100, Math.round(total / 30 * 0.8))
      }
    };
  },
  getInsights: async () => {
    const expenses = getLocalExpenses();
    if (expenses.length === 0) return { insights: [] };

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const insights: any[] = [];

    // Analyze specific trends dynamically
    const catMap: Record<string, number> = {};
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    if (sortedCats.length > 0) {
      const highestCat = sortedCats[0];
      const percent = Math.round((highestCat[1] / totalExpenses) * 100);
      if (percent > 40) {
        insights.push({
          type: 'warning',
          title: `High ${highestCat[0]} Spending`,
          message: `Your ${highestCat[0].toLowerCase()} make up ${percent}% of your total spending. Consider creating a budget.`,
          category: highestCat[0],
          amount: highestCat[1],
          potentialSavings: Math.round(highestCat[1] * 0.1)
        });
      }
    }

    // Check recurring expenses heuristic (multiple same amounts in similar descriptions)
    let possibleSubSavings = 0;
    expenses.filter(e => e.category === 'Entertainment' || e.description.toLowerCase().includes('subscription')).forEach(e => {
      possibleSubSavings += e.amount * 0.2; // Guess 20% can be cut
    });

    if (possibleSubSavings > 0) {
      insights.push({
        type: 'saving',
        title: 'Subscription & Entertainment Audit',
        message: 'You have several entertainment or subscription expenses. Review them to see if you can cancel unused ones.',
        potentialSavings: Math.round(possibleSubSavings)
      });
    }

    insights.push({
      type: 'success',
      title: 'Edge AI Active',
      message: 'Your spending patterns are now being analyzed locally in real-time. Add more expenses to get deeper insights.'
    });

    return { insights };
  },
  processReceipt: async (imageData: string) => {
    // OCR logic mostly client-side. Edge fallback parses OCR text if supplied.
    try {
      const res = await fetch(`${API_URL}/smart-categorizer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse-receipt', text: imageData }),
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return { text: "Scan successful" };
  },

  // Analytics (Dynamic calculation based on local edge data)
  getAnalytics: async () => {
    const expenses = getLocalExpenses();
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const outflow = expenses.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
    const inflow = Math.abs(expenses.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
    const averageExpense = expenses.length > 0 ? outflow / (expenses.filter(e => e.amount > 0).length || 1) : 0;

    // Build Category Breakdown
    const catMap: Record<string, number> = {};
    expenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const categoryBreakdown = Object.entries(catMap)
      .map(([category, amount]) => ({ category, amount, percentage: totalExpenses === 0 ? 0 : (amount / totalExpenses) * 100 }))
      .sort((a, b) => b.amount - a.amount);

    // Build Payment Method Breakdown
    const payMap: Record<string, number> = {};
    expenses.forEach(e => {
      const method = e.paymentMethod || 'Unknown';
      payMap[method] = (payMap[method] || 0) + e.amount;
    });
    const paymentMethodBreakdown = Object.entries(payMap)
      .map(([method, amount]) => ({ method, amount, percentage: totalExpenses === 0 ? 0 : (amount / totalExpenses) * 100 }))
      .sort((a, b) => b.amount - a.amount);

    // Week-by-week trend for current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const weeklyTrend = Array.from({ length: 5 }, (_, i) => {
      const start = i * 7 + 1;
      const end = (i + 1) * 7;
      const weekAmount = monthExpenses
        .filter(e => {
          const day = new Date(e.date).getDate();
          return day >= start && day <= end;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      return { week: `Week ${i + 1}`, amount: weekAmount };
    }).filter(w => w.amount !== 0);

    // Build Source Breakdown (manual, receipt_scan, qr_scan, etc.)
    const srcMap: Record<string, { amount: number; count: number }> = {};
    expenses.forEach(e => {
      const source = e.source || 'manual';
      if (!srcMap[source]) srcMap[source] = { amount: 0, count: 0 };
      srcMap[source].amount += e.amount;
      srcMap[source].count += 1;
    });
    const sourceBreakdown = Object.entries(srcMap)
      .map(([source, { amount, count }]) => ({
        source,
        amount,
        count,
        percentage: totalExpenses === 0 ? 0 : (amount / totalExpenses) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalMonthly: totalExpenses, // net value
      totalOutflow: outflow,
      totalInflow: inflow,
      totalExpenses: expenses.length,
      averageExpense,
      topCategory: categoryBreakdown.length > 0 ? categoryBreakdown[0].category : 'Unknown',
      transactionCount: expenses.length,
      categoryBreakdown,
      paymentMethodBreakdown,
      weeklyTrend,
      sourceBreakdown,
    };
  },

  exportData: async () => ({ success: true, data: getLocalExpenses() }),

  // ── Advanced Edge Computing: Financial Intelligence ──────────────────
  /**
   * Calls the financial-intelligence Supabase Edge Function for
   * server-side anomaly detection, forecasting, clustering, and trends.
   * Falls back to a lightweight local computation if unreachable.
   */
  getFinancialIntelligence: async (action: 'anomalies' | 'forecast' | 'cluster' | 'trends' | 'full' = 'full') => {
    const expenses = getLocalExpenses();

    // Try edge function first
    try {
      const res = await fetch(`${API_URL}/financial-intelligence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses, action }),
      });
      if (res.ok) {
        const data = await res.json();
        return { ...data, source: 'edge' };
      }
    } catch {
      // Edge unreachable — fall through to local computation
    }

    // ── Local fallback ──────────────────────────────────────────────────
    const amounts = expenses.map(e => e.amount);
    const avg = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const sd = amounts.length > 1
      ? Math.sqrt(amounts.reduce((s, v) => s + (v - avg) ** 2, 0) / (amounts.length - 1))
      : 0;

    // Anomalies
    const anomalies = sd > 0
      ? expenses
          .map(e => ({ expense: e, zScore: Math.round(((e.amount - avg) / sd) * 100) / 100 }))
          .filter(a => Math.abs(a.zScore) >= 1.5)
          .map(a => ({
            ...a,
            severity: Math.abs(a.zScore) >= 3 ? 'severe' : Math.abs(a.zScore) >= 2.5 ? 'moderate' : 'mild' as const,
            reason: a.zScore > 0
              ? `₹${a.expense.amount} is ${a.zScore.toFixed(1)}σ above average ₹${avg.toFixed(0)}`
              : `₹${a.expense.amount} is ${Math.abs(a.zScore).toFixed(1)}σ below average ₹${avg.toFixed(0)}`,
          }))
          .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
      : [];

    // Forecast (simple: average of monthly totals)
    const monthMap = new Map<string, number>();
    for (const exp of expenses) {
      const d = new Date(exp.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) || 0) + exp.amount);
    }
    const monthlyTotals = [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total }));
    const lastMonthTotal = monthlyTotals.length > 0 ? monthlyTotals[monthlyTotals.length - 1].total : 0;

    // Trends
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
    const prevYear = curMonth === 0 ? curYear - 1 : curYear;
    const catTrends: Record<string, { cur: number; prev: number }> = {};
    for (const exp of expenses) {
      const d = new Date(exp.date);
      if (!catTrends[exp.category]) catTrends[exp.category] = { cur: 0, prev: 0 };
      if (d.getMonth() === curMonth && d.getFullYear() === curYear) catTrends[exp.category].cur += exp.amount;
      else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) catTrends[exp.category].prev += exp.amount;
    }
    const trends = Object.entries(catTrends).map(([category, { cur, prev }]) => {
      const change = prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;
      return {
        category,
        currentMonth: Math.round(cur),
        lastMonth: Math.round(prev),
        changePercent: Math.round(change * 10) / 10,
        direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      };
    });

    return {
      anomalies,
      forecast: {
        predictedNextMonth: lastMonthTotal,
        trend: 'stable' as const,
        trendPercentage: 0,
        monthlyTotals,
      },
      clusters: [{ centroid: Math.round(avg), label: 'All Expenses', count: expenses.length, avgAmount: Math.round(avg) }],
      trends,
      computedAt: new Date().toISOString(),
      source: 'local-fallback',
    };
  },

  // ── Image Storage Management ─────────────────────────────────────────
  /**
   * Store receipt images and manage image assets
   * Currently using localStorage (client-side storage)
   * Can be enhanced to use Supabase Storage
   */
  uploadImage: async (file: File, expenseId: string): Promise<{ url: string; size: number; id: string }> => {
    try {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const size = file.size;
          const id = `img_${Date.now()}_${expenseId}`;
          
          // Store in localStorage for now
          const storageKey = `receipt_${id}`;
          localStorage.setItem(storageKey, dataUrl);
          
          resolve({
            url: dataUrl,
            size,
            id,
          });
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    } catch (error) {
      throw new Error(`Failed to upload image: ${(error as Error).message}`);
    }
  },

  deleteImage: async (imageId: string): Promise<{ success: boolean }> => {
    try {
      const storageKey = `receipt_${imageId}`;
      localStorage.removeItem(storageKey);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete image: ${(error as Error).message}`);
    }
  },

  getImage: async (imageId: string): Promise<string | null> => {
    try {
      const storageKey = `receipt_${imageId}`;
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  },

  listImages: async (): Promise<Array<{ id: string; createdAt: string }>> => {
    try {
      const images: Array<{ id: string; createdAt: string }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('receipt_')) {
          const id = key.replace('receipt_', '');
          images.push({
            id,
            createdAt: new Date().toISOString(),
          });
        }
      }
      return images;
    } catch {
      return [];
    }
  },

  cleanupOldImages: async (daysOld: number = 90): Promise<{ deletedCount: number }> => {
    try {
      let deletedCount = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('receipt_')) {
          // Extract timestamp from key (format: receipt_TIMESTAMP_expenseId)
          const parts = key.split('_');
          if (parts.length >= 2) {
            const timestamp = parseInt(parts[1]);
            const itemDate = new Date(timestamp);
            if (itemDate < cutoffDate) {
              localStorage.removeItem(key);
              deletedCount++;
            }
          }
        }
      }

      return { deletedCount };
    } catch {
      return { deletedCount: 0 };
    }
  },

  getStorageStats: async (): Promise<{ totalSize: number; imageCount: number; estimatedCost: number }> => {
    try {
      let totalSize = 0;
      let imageCount = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('receipt_')) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += value.length;
            imageCount++;
          }
        }
      }

      // Rough estimate: base64 is ~1.33x original size
      const estimatedMB = (totalSize / 1024 / 1024) / 1.33;
      const costPerGB = 0.024; // AWS S3-like pricing
      const estimatedCost = (estimatedMB / 1024) * costPerGB;

      return {
        totalSize,
        imageCount,
        estimatedCost: Math.round(estimatedCost * 10000) / 10000, // Round to 4 decimals
      };
    } catch {
      return { totalSize: 0, imageCount: 0, estimatedCost: 0 };
    }
  },
};

