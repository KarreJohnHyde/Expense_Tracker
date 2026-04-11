import { Hono } from "npm:hono";
import type { Context } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-8d54d463/health", (c: Context) => {
  return c.json({ status: "ok" });
});

// ==================== EXPENSE ROUTES ====================

// Get all expenses for a user
app.get("/make-server-8d54d463/expenses", async (c: Context) => {
  try {
    const expenses = await kv.getByPrefix("expense:");
    return c.json({ expenses: expenses || [] });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return c.json({ error: 'Failed to fetch expenses', details: String(error) }, 500);
  }
});

// Add new expense
app.post("/make-server-8d54d463/expenses", async (c: Context) => {
  try {
    const body = await c.req.json();
    const { amount, category, description, date, paymentMethod, tags, location, receipt } = body;
    
    const expenseId = `expense:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expense = {
      id: expenseId,
      amount: parseFloat(amount),
      category,
      description,
      date: date || new Date().toISOString(),
      paymentMethod,
      tags: tags || [],
      location: location || null,
      receipt: receipt || null,
      createdAt: new Date().toISOString(),
    };

    await kv.set(expenseId, expense);
    
    // Update category statistics
    await updateCategoryStats(category, parseFloat(amount));
    
    return c.json({ success: true, expense });
  } catch (error) {
    console.error('Error adding expense:', error);
    return c.json({ error: 'Failed to add expense', details: String(error) }, 500);
  }
});

// Update expense
app.put("/make-server-8d54d463/expenses/:id", async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    const body = await c.req.json();
    
    const existingExpense = await kv.get(id);
    if (!existingExpense) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    const updatedExpense = {
      ...existingExpense,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(id, updatedExpense);
    return c.json({ success: true, expense: updatedExpense });
  } catch (error) {
    console.error('Error updating expense:', error);
    return c.json({ error: 'Failed to update expense', details: String(error) }, 500);
  }
});

// Delete expense
app.delete("/make-server-8d54d463/expenses/:id", async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    await kv.del(id);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return c.json({ error: 'Failed to delete expense', details: String(error) }, 500);
  }
});

// ==================== BUDGET ROUTES ====================

// Get budgets
app.get("/make-server-8d54d463/budgets", async (c: Context) => {
  try {
    const budgets = await kv.getByPrefix("budget:");
    return c.json({ budgets: budgets || [] });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return c.json({ error: 'Failed to fetch budgets', details: String(error) }, 500);
  }
});

// Set budget
app.post("/make-server-8d54d463/budgets", async (c: Context) => {
  try {
    const body = await c.req.json();
    const { category, amount, period } = body;
    
    const budgetId = `budget:${category}`;
    const budget = {
      id: budgetId,
      category,
      amount: parseFloat(amount),
      period: period || 'monthly',
      createdAt: new Date().toISOString(),
    };

    await kv.set(budgetId, budget);
    return c.json({ success: true, budget });
  } catch (error) {
    console.error('Error setting budget:', error);
    return c.json({ error: 'Failed to set budget', details: String(error) }, 500);
  }
});

// Update budget
app.put("/make-server-8d54d463/budgets/:id", async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    const body = await c.req.json();
    
    const existingBudget = await kv.get(id);
    if (!existingBudget) {
      return c.json({ error: 'Budget not found' }, 404);
    }

    const updatedBudget = {
      ...existingBudget,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(id, updatedBudget);
    return c.json({ success: true, budget: updatedBudget });
  } catch (error) {
    console.error('Error updating budget:', error);
    return c.json({ error: 'Failed to update budget', details: String(error) }, 500);
  }
});

// Delete budget
app.delete("/make-server-8d54d463/budgets/:id", async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    await kv.del(id);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return c.json({ error: 'Failed to delete budget', details: String(error) }, 500);
  }
});

// ==================== AI/ML ROUTES ====================

// AI Expense Categorization
app.post("/make-server-8d54d463/ai/categorize", async (c: Context) => {
  try {
    const body = await c.req.json();
    const { description, amount } = body;
    
    // Simulate AI categorization with keyword matching
    const category = categorizeExpense(description, amount);
    const confidence = calculateConfidence(description, category);
    
    return c.json({ 
      category, 
      confidence,
      suggestions: getSimilarCategories(description)
    });
  } catch (error) {
    console.error('Error in AI categorization:', error);
    return c.json({ error: 'Failed to categorize expense', details: String(error) }, 500);
  }
});

// AI Budget Predictions
app.get("/make-server-8d54d463/ai/predictions", async (c: Context) => {
  try {
    const expenses = await kv.getByPrefix("expense:");
    const predictions = generatePredictions(expenses || []);
    
    return c.json({ predictions });
  } catch (error) {
    console.error('Error generating predictions:', error);
    return c.json({ error: 'Failed to generate predictions', details: String(error) }, 500);
  }
});

// AI Spending Insights
app.get("/make-server-8d54d463/ai/insights", async (c: Context) => {
  try {
    const expenses = await kv.getByPrefix("expense:");
    const insights = generateInsights(expenses || []);
    
    return c.json({ insights });
  } catch (error) {
    console.error('Error generating insights:', error);
    return c.json({ error: 'Failed to generate insights', details: String(error) }, 500);
  }
});

// Receipt OCR Processing
app.post("/make-server-8d54d463/ai/ocr", async (c: Context) => {
  try {
    const body = await c.req.json();
    const { imageData } = body;
    
    // Simulate OCR extraction (in real app, this would use Tesseract or cloud OCR)
    const extractedData = {
      amount: extractAmountFromReceipt(imageData),
      merchant: extractMerchantFromReceipt(imageData),
      date: new Date().toISOString(),
      items: [],
    };
    
    return c.json({ success: true, data: extractedData });
  } catch (error) {
    console.error('Error in OCR processing:', error);
    return c.json({ error: 'Failed to process receipt', details: String(error) }, 500);
  }
});

// ==================== ANALYTICS ROUTES ====================

// Get spending analytics
app.get("/make-server-8d54d463/analytics", async (c: Context) => {
  try {
    const expenses = await kv.getByPrefix("expense:");
    const analytics = calculateAnalytics(expenses || []);
    
    return c.json({ analytics });
  } catch (error) {
    console.error('Error calculating analytics:', error);
    return c.json({ error: 'Failed to calculate analytics', details: String(error) }, 500);
  }
});

// Export data
app.get("/make-server-8d54d463/export", async (c: Context) => {
  try {
    const expenses = await kv.getByPrefix("expense:");
    const budgets = await kv.getByPrefix("budget:");
    
    const exportData = {
      expenses: expenses || [],
      budgets: budgets || [],
      exportedAt: new Date().toISOString(),
    };
    
    return c.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    return c.json({ error: 'Failed to export data', details: String(error) }, 500);
  }
});

// ==================== HELPER FUNCTIONS ====================

async function updateCategoryStats(category: string, amount: number) {
  const statsId = `stats:${category}`;
  const existingStats = await kv.get(statsId) || { total: 0, count: 0 };
  
  const updatedStats = {
    total: existingStats.total + amount,
    count: existingStats.count + 1,
    average: (existingStats.total + amount) / (existingStats.count + 1),
    lastUpdated: new Date().toISOString(),
  };
  
  await kv.set(statsId, updatedStats);
}

function categorizeExpense(description: string, amount: number): string {
  const desc = description.toLowerCase();
  
  // Food & Dining
  if (desc.includes('restaurant') || desc.includes('food') || desc.includes('cafe') || 
      desc.includes('coffee') || desc.includes('lunch') || desc.includes('dinner') ||
      desc.includes('breakfast') || desc.includes('zomato') || desc.includes('swiggy')) {
    return 'Food & Dining';
  }
  
  // Transportation
  if (desc.includes('uber') || desc.includes('ola') || desc.includes('taxi') || 
      desc.includes('metro') || desc.includes('bus') || desc.includes('fuel') ||
      desc.includes('petrol') || desc.includes('diesel')) {
    return 'Transportation';
  }
  
  // Shopping
  if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('shopping') ||
      desc.includes('clothes') || desc.includes('mall')) {
    return 'Shopping';
  }
  
  // Bills & Utilities
  if (desc.includes('electricity') || desc.includes('water') || desc.includes('internet') ||
      desc.includes('phone') || desc.includes('bill')) {
    return 'Bills & Utilities';
  }
  
  // Entertainment
  if (desc.includes('movie') || desc.includes('netflix') || desc.includes('spotify') ||
      desc.includes('game') || desc.includes('entertainment')) {
    return 'Entertainment';
  }
  
  // Healthcare
  if (desc.includes('doctor') || desc.includes('hospital') || desc.includes('medicine') ||
      desc.includes('pharmacy') || desc.includes('health')) {
    return 'Healthcare';
  }
  
  // Education
  if (desc.includes('course') || desc.includes('book') || desc.includes('education') ||
      desc.includes('tuition') || desc.includes('school')) {
    return 'Education';
  }
  
  return 'Others';
}

function calculateConfidence(description: string, category: string): number {
  const desc = description.toLowerCase();
  const keywords = {
    'Food & Dining': ['restaurant', 'food', 'cafe', 'coffee', 'lunch', 'dinner'],
    'Transportation': ['uber', 'ola', 'taxi', 'metro', 'bus', 'fuel'],
    'Shopping': ['amazon', 'flipkart', 'shopping', 'clothes'],
    'Bills & Utilities': ['electricity', 'water', 'internet', 'phone', 'bill'],
    'Entertainment': ['movie', 'netflix', 'spotify', 'game'],
    'Healthcare': ['doctor', 'hospital', 'medicine', 'pharmacy'],
    'Education': ['course', 'book', 'education', 'tuition'],
  };
  
  const categoryKeywords = keywords[category as keyof typeof keywords] || [];
  const matches = categoryKeywords.filter(kw => desc.includes(kw)).length;
  
  return Math.min(0.95, 0.5 + (matches * 0.15));
}

function getSimilarCategories(description: string): string[] {
  const categories = [
    'Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities',
    'Entertainment', 'Healthcare', 'Education', 'Others'
  ];
  
  return categories.slice(0, 3);
}

function generatePredictions(expenses: any[]): any {
  const now = new Date();
  const currentMonth = now.getMonth();
  
  // Calculate current month spending
  const currentMonthExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate.getMonth() === currentMonth;
  });
  
  const totalCurrentMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const daysInMonth = new Date(now.getFullYear(), currentMonth + 1, 0).getDate();
  const currentDay = now.getDate();
  
  // Predict month-end spending
  const dailyAverage = totalCurrentMonth / currentDay;
  const predictedMonthEnd = dailyAverage * daysInMonth;
  
  return {
    currentMonthSpending: totalCurrentMonth,
    predictedMonthEnd: Math.round(predictedMonthEnd),
    dailyAverage: Math.round(dailyAverage),
    recommendedDailyBudget: Math.round(predictedMonthEnd / daysInMonth * 0.9),
  };
}

function generateInsights(expenses: any[]): any[] {
  const insights = [];
  
  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  
  const topCategory = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (topCategory) {
    insights.push({
      type: 'top_category',
      title: 'Top Spending Category',
      message: `You spent ₹${topCategory[1].toFixed(2)} on ${topCategory[0]} this month`,
      category: topCategory[0],
      amount: topCategory[1],
    });
  }
  
  // Unusual spending
  const avgExpense = expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length;
  const highExpenses = expenses.filter(e => e.amount > avgExpense * 2);
  
  if (highExpenses.length > 0) {
    insights.push({
      type: 'unusual_spending',
      title: 'Unusual Expenses Detected',
      message: `Found ${highExpenses.length} expenses higher than usual`,
      count: highExpenses.length,
    });
  }
  
  // Savings opportunity
  const foodSpending = categoryTotals['Food & Dining'] || 0;
  if (foodSpending > 5000) {
    insights.push({
      type: 'savings_opportunity',
      title: 'Savings Opportunity',
      message: `You could save ₹${(foodSpending * 0.2).toFixed(2)} by reducing dining out by 20%`,
      category: 'Food & Dining',
      potentialSavings: foodSpending * 0.2,
    });
  }
  
  return insights;
}

function calculateAnalytics(expenses: any[]): any {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Monthly totals
  const monthlyExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  });
  
  const totalMonthly = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  monthlyExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  
  // Payment method breakdown
  const paymentMethodTotals: Record<string, number> = {};
  monthlyExpenses.forEach(e => {
    if (e.paymentMethod) {
      paymentMethodTotals[e.paymentMethod] = (paymentMethodTotals[e.paymentMethod] || 0) + e.amount;
    }
  });
  
  // Weekly trend
  const weeklyData = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(currentYear, currentMonth, i * 7 + 1);
    const weekEnd = new Date(currentYear, currentMonth, (i + 1) * 7);
    
    const weekExpenses = monthlyExpenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= weekStart && expenseDate < weekEnd;
    });
    
    weeklyData.push({
      week: `Week ${i + 1}`,
      amount: weekExpenses.reduce((sum, e) => sum + e.amount, 0),
    });
  }
  
  return {
    totalMonthly,
    totalExpenses: expenses.length,
    averageExpense: totalMonthly / (monthlyExpenses.length || 1),
    categoryBreakdown: Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalMonthly) * 100,
    })),
    paymentMethodBreakdown: Object.entries(paymentMethodTotals).map(([method, amount]) => ({
      method,
      amount,
    })),
    weeklyTrend: weeklyData,
  };
}

function extractAmountFromReceipt(imageData: string): number {
  // Simulate amount extraction
  return Math.random() * 1000 + 100;
}

function extractMerchantFromReceipt(imageData: string): string {
  const merchants = ['Big Bazaar', 'Reliance Fresh', 'More Supermarket', 'DMart'];
  return merchants[Math.floor(Math.random() * merchants.length)];
}

Deno.serve(app.fetch);
