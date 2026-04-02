import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8d54d463`;

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
    { id: 'demo-1',  description: 'Swiggy Food Order',       amount: 450,   category: 'Food & Dining',      date: new Date(y, m, 1).toISOString(),  paymentMethod: 'UPI' },
    { id: 'demo-2',  description: 'Uber Ride to Office',      amount: 280,   category: 'Transportation',     date: new Date(y, m, 2).toISOString(),  paymentMethod: 'UPI' },
    { id: 'demo-3',  description: 'Amazon Electronics',       amount: 3999,  category: 'Shopping',           date: new Date(y, m, 3).toISOString(),  paymentMethod: 'Credit Card' },
    { id: 'demo-4',  description: 'Electricity Bill',         amount: 2100,  category: 'Bills & Utilities',  date: new Date(y, m, 4).toISOString(),  paymentMethod: 'Net Banking' },
    { id: 'demo-5',  description: 'Netflix Subscription',     amount: 649,   category: 'Entertainment',      date: new Date(y, m, 5).toISOString(),  paymentMethod: 'Debit Card' },
    { id: 'demo-6',  description: 'Apollo Pharmacy',          amount: 870,   category: 'Healthcare',         date: new Date(y, m, 6).toISOString(),  paymentMethod: 'Cash' },
    { id: 'demo-7',  description: 'Udemy Course',             amount: 499,   category: 'Education',          date: new Date(y, m, 7).toISOString(),  paymentMethod: 'UPI' },
    { id: 'demo-8',  description: 'Cafe Coffee Day',          amount: 320,   category: 'Food & Dining',      date: new Date(y, m, 8).toISOString(),  paymentMethod: 'Cash' },
    { id: 'demo-9',  description: 'Petrol Fill-up',           amount: 1500,  category: 'Transportation',     date: new Date(y, m, 9).toISOString(),  paymentMethod: 'Debit Card' },
    { id: 'demo-10', description: 'Myntra Clothing',          amount: 2450,  category: 'Shopping',           date: new Date(y, m, 10).toISOString(), paymentMethod: 'Credit Card' },
    { id: 'demo-11', description: 'Mobile Recharge',          amount: 599,   category: 'Bills & Utilities',  date: new Date(y, m, 11).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-12', description: 'Movie Tickets – PVR',      amount: 750,   category: 'Entertainment',      date: new Date(y, m, 12).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-13', description: 'Zomato Dinner',            amount: 890,   category: 'Food & Dining',      date: new Date(y, m, 14).toISOString(), paymentMethod: 'Credit Card' },
    { id: 'demo-14', description: 'Gym Membership',           amount: 3000,  category: 'Healthcare',         date: new Date(y, m, 15).toISOString(), paymentMethod: 'Net Banking' },
    { id: 'demo-15', description: 'Ola Auto Ride',            amount: 120,   category: 'Transportation',     date: new Date(y, m, 16).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-16', description: 'Flipkart Phone Case',      amount: 399,   category: 'Shopping',           date: new Date(y, m, 18).toISOString(), paymentMethod: 'UPI' },
    { id: 'demo-17', description: 'Water Bill',               amount: 450,   category: 'Bills & Utilities',  date: new Date(y, m, 20).toISOString(), paymentMethod: 'Net Banking' },
    { id: 'demo-18', description: 'Coursera Subscription',    amount: 1200,  category: 'Education',          date: new Date(y, m, 22).toISOString(), paymentMethod: 'Credit Card' },
    { id: 'demo-19', description: 'Grocery – BigBasket',      amount: 1850,  category: 'Food & Dining',      date: new Date(y, m, 24).toISOString(), paymentMethod: 'Debit Card' },
    { id: 'demo-20', description: 'Metro Card Recharge',      amount: 500,   category: 'Transportation',     date: new Date(y, m, 25).toISOString(), paymentMethod: 'UPI' },
  ];
}

function generateDemoBudgets(): Budget[] {
  return [
    { id: 'bud-1', category: 'Food & Dining',     amount: 8000,  period: 'monthly' },
    { id: 'bud-2', category: 'Transportation',     amount: 5000,  period: 'monthly' },
    { id: 'bud-3', category: 'Shopping',           amount: 10000, period: 'monthly' },
    { id: 'bud-4', category: 'Bills & Utilities',  amount: 6000,  period: 'monthly' },
    { id: 'bud-5', category: 'Entertainment',      amount: 3000,  period: 'monthly' },
    { id: 'bud-6', category: 'Healthcare',         amount: 5000,  period: 'monthly' },
    { id: 'bud-7', category: 'Education',          amount: 4000,  period: 'monthly' },
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

// ── API Helpers ────────────────────────────────────────────────────────
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/** Wraps an api call so that network / server failures fall back to demo data. */
async function safeApiCall<T>(endpoint: string, options: RequestInit | undefined, fallback: T): Promise<T> {
  try {
    return await apiCall(endpoint, options);
  } catch {
    console.warn(`[api] ${endpoint} failed – using demo data`);
    return fallback;
  }
}

export const api = {
  // Expenses
  getExpenses: () =>
    safeApiCall('/expenses', undefined, { expenses: generateDemoExpenses() }),
  addExpense: (expense: Omit<Expense, 'id'>) => apiCall('/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  }),
  updateExpense: (id: string, expense: Partial<Expense>) => apiCall(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(expense),
  }),
  deleteExpense: (id: string) => apiCall(`/expenses/${id}`, {
    method: 'DELETE',
  }),

  // Budgets
  getBudgets: () =>
    safeApiCall('/budgets', undefined, { budgets: generateDemoBudgets() }),
  setBudget: (budget: Omit<Budget, 'id'>) => apiCall('/budgets', {
    method: 'POST',
    body: JSON.stringify(budget),
  }),
  updateBudget: (id: string, budget: Partial<Budget>) => apiCall(`/budgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(budget),
  }),
  deleteBudget: (id: string) => apiCall(`/budgets/${id}`, {
    method: 'DELETE',
  }),
  clearAllBudgets: () => apiCall('/budgets/clear', {
    method: 'DELETE',
  }),

  // AI/ML
  categorizeExpense: (description: string, amount: number) =>
    safeApiCall('/ai/categorize', {
      method: 'POST',
      body: JSON.stringify({ description, amount }),
    }, { category: 'Others', confidence: 0.5 }),
  getPredictions: () =>
    safeApiCall('/ai/predictions', undefined, generateDemoPredictions()),
  getInsights: () =>
    safeApiCall('/ai/insights', undefined, generateDemoInsights()),
  processReceipt: (imageData: string) => apiCall('/ai/ocr', {
    method: 'POST',
    body: JSON.stringify({ imageData }),
  }),

  // Analytics
  getAnalytics: () =>
    safeApiCall('/analytics', undefined, {
      totalExpenses: 22826,
      monthlyAverage: 19500,
      topCategory: 'Food & Dining',
      transactionCount: 20,
    }),
  exportData: () => apiCall('/export'),
};