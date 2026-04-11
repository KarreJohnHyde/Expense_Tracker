// Supabase Edge Function API
/* eslint-disable @typescript-eslint/no-explicit-any */
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

// ── Simulated Edge Operations (Local Storage Backed) ────────────────────
const STORAGE_KEYS = {
  EXPENSES: 'expenseai_expenses',
  BUDGETS: 'expenseai_budgets'
};

function getLocalExpenses(): Expense[] {
  const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
  if (data) return JSON.parse(data);
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
  const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
  if (data) return JSON.parse(data);
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
    const newExpense = { ...expense, id: `exp_${Date.now()}` };
    saveLocalExpenses([newExpense, ...expenses]);
    return newExpense;
  },
  updateExpense: async (id: string, updates: Partial<Expense>) => {
    const expenses = getLocalExpenses();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx > -1) {
      expenses[idx] = { ...expenses[idx], ...updates };
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
  categorizeExpense: async (description: string, amount: number) => ({ category: 'Others', confidence: 0.5 }), // Substituted by our local classifier.ts where needed
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
    const sortedCats = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
    
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
    // OCR logic moved mostly to client side tesseract, this is a fallback mock
    return { text: "Scan successful" }; 
  },

  // Analytics (Dynamic calculation based on local edge data)
  getAnalytics: async () => {
    const expenses = getLocalExpenses();
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
    
    // Build Category Breakdown
    const catMap: Record<string, number> = {};
    expenses.forEach(e => {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const categoryBreakdown = Object.entries(catMap)
      .map(([category, amount]) => ({ category, amount, percentage: (amount / totalExpenses) * 100 }))
      .sort((a,b) => b.amount - a.amount);
      
    // Build Payment Method Breakdown
    const payMap: Record<string, number> = {};
    expenses.forEach(e => {
        const method = e.paymentMethod || 'Unknown';
        payMap[method] = (payMap[method] || 0) + e.amount;
    });
    const paymentMethodBreakdown = Object.entries(payMap)
      .map(([method, amount]) => ({ method, amount, percentage: (amount / totalExpenses) * 100 }))
      .sort((a,b) => b.amount - a.amount);

    return {
      totalMonthly: totalExpenses, // roughly
      totalExpenses: expenses.length,
      averageExpense,
      topCategory: categoryBreakdown.length > 0 ? categoryBreakdown[0].category : 'Unknown',
      transactionCount: expenses.length,
      categoryBreakdown,
      paymentMethodBreakdown,
    };
  },
  
  exportData: async () => ({ success: true, data: getLocalExpenses() }),
};