import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  user_id: string
}

interface ConversationContext {
  userId: string
  expenses: Expense[]
  recentMessages: Array<{role: 'user' | 'assistant', content: string}>
  mlInsights?: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { action, message, context } = await req.json()

    switch (action) {
      case 'chat':
        return await handleChat(supabaseClient, message, context)
      case 'analyze':
        return await handleAnalyze(supabaseClient, context)
      case 'insights':
        return await handleInsights(supabaseClient, context)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Error in advanced-ai function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleChat(supabaseClient: any, message: string, context: ConversationContext) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  // Get user's expense data
  const { data: expenses, error } = await supabaseClient
    .from('expenses')
    .select('*')
    .eq('user_id', context.userId)
    .order('date', { ascending: false })
    .limit(100)

  if (error) throw error

  // Prepare conversation context
  const systemPrompt = createSystemPrompt(expenses || [], context)

  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...context.recentMessages.slice(-10), // Last 10 messages for context
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      functions: getAvailableFunctions(),
      function_call: 'auto'
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const choice = data.choices[0]

  if (choice.finish_reason === 'function_call') {
    // Handle function calls
    const functionResult = await handleFunctionCall(choice.message.function_call, supabaseClient, context)
    return new Response(JSON.stringify({
      response: functionResult,
      functionCalled: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({
    response: choice.message.content,
    usage: data.usage
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handleAnalyze(supabaseClient: any, context: ConversationContext) {
  const { data: expenses, error } = await supabaseClient
    .from('expenses')
    .select('*')
    .eq('user_id', context.userId)
    .order('date', { ascending: false })
    .limit(500)

  if (error) throw error

  const analysis = await performAdvancedAnalysis(expenses || [])

  return new Response(JSON.stringify({
    analysis,
    insights: generateInsights(analysis)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handleInsights(supabaseClient: any, context: ConversationContext) {
  // Get ML predictions if available
  const mlInsights = context.mlInsights || {}

  const insights = {
    spendingPatterns: analyzeSpendingPatterns(context.expenses),
    budgetRecommendations: generateBudgetRecommendations(context.expenses),
    anomalyDetection: mlInsights.anomaly || {},
    forecasting: mlInsights.forecast || {},
    financialHealth: calculateFinancialHealth(context.expenses)
  }

  return new Response(JSON.stringify({ insights }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function createSystemPrompt(expenses: Expense[], context: ConversationContext): string {
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const avgTransaction = totalSpent / expenses.length || 0
  const categories = [...new Set(expenses.map(e => e.category))]

  return `You are an advanced AI Financial Advisor with deep expertise in personal finance, behavioral economics, and data analysis. You have access to the user's complete expense history and can perform sophisticated financial analysis.

USER FINANCIAL PROFILE:
- Total transactions analyzed: ${expenses.length}
- Total amount spent: ₹${totalSpent.toLocaleString()}
- Average transaction: ₹${avgTransaction.toFixed(0)}
- Active categories: ${categories.join(', ')}
- Time period: Last 6 months of data

YOUR CAPABILITIES:
1. Advanced financial analysis and pattern recognition
2. Behavioral finance insights and recommendations
3. Budget optimization and cash flow analysis
4. Anomaly detection and fraud prevention
5. Predictive analytics and forecasting
6. Tax optimization strategies
7. Investment recommendations based on spending patterns
8. Goal-based financial planning

COMMUNICATION STYLE:
- Professional yet approachable
- Use financial terminology accurately but explain complex concepts
- Provide actionable insights with specific numbers
- Be proactive in identifying opportunities and risks
- Use emojis sparingly and strategically
- Always back up recommendations with data from their spending

AVAILABLE FUNCTIONS:
- analyze_spending_patterns: Deep analysis of spending behavior
- generate_budget_plan: Create personalized budget recommendations
- detect_anomalies: Identify unusual spending patterns
- forecast_expenses: Predict future spending trends
- calculate_savings_potential: Identify areas for cost reduction

When analyzing data, always consider:
- Seasonal patterns and trends
- Category-wise spending distribution
- Transaction frequency and amounts
- Potential savings opportunities
- Risk factors and financial health indicators

Respond helpfully and provide specific, actionable advice based on their actual spending data.`
}

function getAvailableFunctions() {
  return [
    {
      name: 'analyze_spending_patterns',
      description: 'Perform deep analysis of spending patterns and behavior',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['week', 'month', 'quarter', 'year'],
            description: 'Time period to analyze'
          },
          focus_areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific areas to focus on'
          }
        }
      }
    },
    {
      name: 'generate_budget_plan',
      description: 'Create a personalized budget plan based on spending history',
      parameters: {
        type: 'object',
        properties: {
          monthly_income: { type: 'number', description: 'Monthly income amount' },
          savings_goal: { type: 'number', description: 'Desired monthly savings' }
        }
      }
    },
    {
      name: 'detect_anomalies',
      description: 'Identify unusual or suspicious spending patterns',
      parameters: {
        type: 'object',
        properties: {
          sensitivity: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Detection sensitivity level'
          }
        }
      }
    }
  ]
}

async function handleFunctionCall(functionCall: any, supabaseClient: any, context: ConversationContext) {
  const { name, arguments: args } = functionCall

  switch (name) {
    case 'analyze_spending_patterns':
      return await analyzeSpendingPatterns(context.expenses, JSON.parse(args))
    case 'generate_budget_plan':
      return await generateBudgetPlan(context.expenses, JSON.parse(args))
    case 'detect_anomalies':
      return await detectAnomalies(context.expenses, JSON.parse(args))
    default:
      return { error: `Unknown function: ${name}` }
  }
}

async function analyzeSpendingPatterns(expenses: Expense[], params: any) {
  // Advanced pattern analysis
  const patterns = {
    dailySpending: calculateDailyPatterns(expenses),
    categoryTrends: analyzeCategoryTrends(expenses),
    seasonalPatterns: detectSeasonalPatterns(expenses),
    spendingVelocity: calculateSpendingVelocity(expenses),
    correlationAnalysis: findSpendingCorrelations(expenses)
  }

  return {
    patterns,
    insights: generatePatternInsights(patterns),
    recommendations: generatePatternRecommendations(patterns)
  }
}

async function generateBudgetPlan(expenses: Expense[], params: any) {
  const { monthly_income, savings_goal } = params

  const currentSpending = calculateMonthlySpending(expenses)
  const budget = createOptimizedBudget(currentSpending, monthly_income, savings_goal)

  return {
    currentSpending,
    proposedBudget: budget,
    savingsPotential: calculateSavingsPotential(currentSpending, budget),
    implementationSteps: generateImplementationSteps(budget)
  }
}

async function detectAnomalies(expenses: Expense[], params: any) {
  const { sensitivity = 'medium' } = params

  const anomalies = performAnomalyDetection(expenses, sensitivity)

  return {
    anomalies,
    riskAssessment: assessFinancialRisk(anomalies),
    recommendations: generateSecurityRecommendations(anomalies)
  }
}

// Helper functions for advanced analysis
function calculateDailyPatterns(expenses: Expense[]) {
  const dailyTotals = expenses.reduce((acc, exp) => {
    const date = new Date(exp.date).toDateString()
    acc[date] = (acc[date] || 0) + exp.amount
    return acc
  }, {} as Record<string, number>)

  return {
    averageDaily: Object.values(dailyTotals).reduce((a, b) => a + b, 0) / Object.keys(dailyTotals).length,
    peakDays: Object.entries(dailyTotals).sort(([,a], [,b]) => b - a).slice(0, 3),
    consistency: calculateConsistency(Object.values(dailyTotals))
  }
}

function analyzeCategoryTrends(expenses: Expense[]) {
  const categoryStats = expenses.reduce((acc, exp) => {
    if (!acc[exp.category]) {
      acc[exp.category] = { total: 0, count: 0, amounts: [] }
    }
    acc[exp.category].total += exp.amount
    acc[exp.category].count += 1
    acc[exp.category].amounts.push(exp.amount)
    return acc
  }, {} as Record<string, any>)

  return Object.entries(categoryStats).map(([category, stats]) => ({
    category,
    total: stats.total,
    average: stats.total / stats.count,
    frequency: stats.count,
    volatility: calculateVolatility(stats.amounts)
  }))
}

function detectSeasonalPatterns(expenses: Expense[]) {
  // Simple seasonal analysis
  const monthlyTotals = expenses.reduce((acc, exp) => {
    const month = new Date(exp.date).getMonth()
    acc[month] = (acc[month] || 0) + exp.amount
    return acc
  }, {} as Record<number, number>)

  return {
    monthlyAverages: Object.entries(monthlyTotals).map(([month, total]) => ({
      month: parseInt(month),
      average: total / (expenses.filter(e => new Date(e.date).getMonth() === parseInt(month)).length || 1)
    })),
    peakSeason: Object.entries(monthlyTotals).sort(([,a], [,b]) => b - a)[0]
  }
}

function calculateSpendingVelocity(expenses: Expense[]) {
  const sortedExpenses = expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const velocities = []

  for (let i = 1; i < sortedExpenses.length; i++) {
    const timeDiff = new Date(sortedExpenses[i].date).getTime() - new Date(sortedExpenses[i-1].date).getTime()
    const amountDiff = sortedExpenses[i].amount - sortedExpenses[i-1].amount
    velocities.push(amountDiff / (timeDiff / (1000 * 60 * 60 * 24))) // amount per day
  }

  return {
    averageVelocity: velocities.reduce((a, b) => a + b, 0) / velocities.length,
    acceleration: calculateAcceleration(velocities)
  }
}

function findSpendingCorrelations(expenses: Expense[]) {
  // Simple correlation analysis between categories
  const categories = [...new Set(expenses.map(e => e.category))]
  const correlations = {}

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const cat1 = categories[i]
      const cat2 = categories[j]

      const cat1Amounts = expenses.filter(e => e.category === cat1).map(e => e.amount)
      const cat2Amounts = expenses.filter(e => e.category === cat2).map(e => e.amount)

      correlations[`${cat1}-${cat2}`] = calculateCorrelation(cat1Amounts, cat2Amounts)
    }
  }

  return correlations
}

async function performAdvancedAnalysis(expenses: Expense[]) {
  return {
    spendingPatterns: calculateDailyPatterns(expenses),
    categoryAnalysis: analyzeCategoryTrends(expenses),
    seasonalTrends: detectSeasonalPatterns(expenses),
    velocityAnalysis: calculateSpendingVelocity(expenses),
    correlations: findSpendingCorrelations(expenses),
    riskMetrics: calculateRiskMetrics(expenses),
    optimizationOpportunities: identifyOptimizationOpportunities(expenses)
  }
}

function generateInsights(analysis: any) {
  const insights = []

  // Spending pattern insights
  if (analysis.spendingPatterns.averageDaily > 1000) {
    insights.push({
      type: 'warning',
      title: 'High Daily Spending',
      description: `Your average daily spend of ₹${analysis.spendingPatterns.averageDaily.toFixed(0)} is above typical levels. Consider reviewing discretionary expenses.`
    })
  }

  // Category insights
  const topCategory = analysis.categoryAnalysis.sort((a, b) => b.total - a.total)[0]
  if (topCategory) {
    insights.push({
      type: 'info',
      title: 'Primary Spending Category',
      description: `${topCategory.category} accounts for ₹${topCategory.total.toFixed(0)} of your total spending.`
    })
  }

  // Seasonal insights
  const peakMonth = analysis.seasonalTrends.peakSeason
  if (peakMonth) {
    insights.push({
      type: 'trend',
      title: 'Peak Spending Month',
      description: `You spend the most in ${getMonthName(peakMonth[0])}. Consider building a buffer for this period.`
    })
  }

  return insights
}

// Utility functions
function calculateConsistency(amounts: number[]): number {
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const variance = amounts.reduce((acc, amount) => acc + Math.pow(amount - mean, 2), 0) / amounts.length
  return Math.sqrt(variance) / mean // Coefficient of variation
}

function calculateVolatility(amounts: number[]): number {
  if (amounts.length < 2) return 0
  const returns = []
  for (let i = 1; i < amounts.length; i++) {
    returns.push((amounts[i] - amounts[i-1]) / amounts[i-1])
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / returns.length
  return Math.sqrt(variance)
}

function calculateAcceleration(velocities: number[]): number {
  if (velocities.length < 2) return 0
  const accelerations = []
  for (let i = 1; i < velocities.length; i++) {
    accelerations.push(velocities[i] - velocities[i-1])
  }
  return accelerations.reduce((a, b) => a + b, 0) / accelerations.length
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0

  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}

function getMonthName(monthIndex: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
  return months[monthIndex]
}

function calculateMonthlySpending(expenses: Expense[]) {
  const monthlyTotals = expenses.reduce((acc, exp) => {
    const month = new Date(exp.date).toISOString().slice(0, 7) // YYYY-MM
    acc[month] = (acc[month] || 0) + exp.amount
    return acc
  }, {} as Record<string, number>)

  return Object.entries(monthlyTotals).map(([month, total]) => ({ month, total }))
}

function createOptimizedBudget(currentSpending: any[], income: number, savingsGoal: number) {
  // Simple budget optimization logic
  const averageMonthly = currentSpending.reduce((sum, month) => sum + month.total, 0) / currentSpending.length
  const availableForSpending = income - savingsGoal

  const categories = ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Utilities', 'Healthcare']
  const budget = {}

  // Allocate based on current spending patterns but optimized
  categories.forEach(category => {
    const currentAvg = currentSpending.reduce((sum, month) => sum + (month[category] || 0), 0) / currentSpending.length
    budget[category] = Math.min(currentAvg * 0.9, availableForSpending * 0.3) // 10% reduction or 30% of available
  })

  return budget
}

function calculateSavingsPotential(current: any[], budget: any) {
  // Calculate potential savings
  return Object.keys(budget).reduce((total, category) => {
    const currentAvg = current.reduce((sum, month) => sum + (month[category] || 0), 0) / current.length
    return total + Math.max(0, currentAvg - budget[category])
  }, 0)
}

function generateImplementationSteps(budget: any) {
  return [
    'Review your current spending in each category',
    'Set up automatic transfers to savings account',
    'Use budgeting apps to track progress',
    'Review and adjust budget monthly',
    'Celebrate milestones and progress'
  ]
}

function performAnomalyDetection(expenses: Expense[], sensitivity: string) {
  const threshold = sensitivity === 'high' ? 2 : sensitivity === 'low' ? 0.5 : 1
  const amounts = expenses.map(e => e.amount)
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const stdDev = Math.sqrt(amounts.reduce((acc, amount) => acc + Math.pow(amount - mean, 2), 0) / amounts.length)

  return expenses.filter(exp => Math.abs(exp.amount - mean) > threshold * stdDev)
}

function assessFinancialRisk(anomalies: Expense[]) {
  const riskScore = Math.min(anomalies.length * 10, 100)
  return {
    score: riskScore,
    level: riskScore > 70 ? 'High' : riskScore > 40 ? 'Medium' : 'Low',
    description: riskScore > 70 ? 'Significant unusual spending detected' :
                 riskScore > 40 ? 'Some unusual patterns observed' : 'Spending appears normal'
  }
}

function generateSecurityRecommendations(anomalies: Expense[]) {
  const recommendations = []

  if (anomalies.length > 0) {
    recommendations.push('Review recent transactions for potential fraud')
    recommendations.push('Enable transaction notifications')
    recommendations.push('Consider setting spending limits')
  }

  return recommendations
}

function calculateRiskMetrics(expenses: Expense[]) {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const avgTransaction = total / expenses.length
  const volatility = calculateVolatility(expenses.map(e => e.amount))

  return {
    concentrationRisk: calculateConcentrationRisk(expenses),
    volatilityRisk: volatility,
    frequencyRisk: expenses.length < 10 ? 'Low transaction volume' : 'Normal',
    amountRisk: avgTransaction > 1000 ? 'High-value transactions' : 'Normal'
  }
}

function calculateConcentrationRisk(expenses: Expense[]) {
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount
    return acc
  }, {} as Record<string, number>)

  const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0)
  const maxCategory = Math.max(...Object.values(categoryTotals))
  return (maxCategory / total) * 100 // Percentage in largest category
}

function identifyOptimizationOpportunities(expenses: Expense[]) {
  const opportunities = []

  // Find high-frequency low-value transactions
  const frequentSmall = expenses.filter(e => e.amount < 100).length
  if (frequentSmall > expenses.length * 0.3) {
    opportunities.push({
      type: 'consolidation',
      title: 'Consolidate Small Transactions',
      description: 'Many small transactions could be bundled for better rates',
      potentialSavings: frequentSmall * 5 // Assume ₹5 savings per transaction
    })
  }

  // Find subscription-like patterns
  const monthlyPatterns = findMonthlyPatterns(expenses)
  if (monthlyPatterns.length > 0) {
    opportunities.push({
      type: 'subscription',
      title: 'Review Recurring Charges',
      description: `${monthlyPatterns.length} potential subscription patterns detected`,
      potentialSavings: monthlyPatterns.reduce((sum, pattern) => sum + pattern.amount * 0.1, 0)
    })
  }

  return opportunities
}

function findMonthlyPatterns(expenses: Expense[]) {
  // Simple pattern detection for recurring expenses
  const patterns = []
  const descriptions = [...new Set(expenses.map(e => e.description.toLowerCase()))]

  descriptions.forEach(desc => {
    const matchingExpenses = expenses.filter(e =>
      e.description.toLowerCase().includes(desc) ||
      desc.includes(e.description.toLowerCase().slice(0, 10))
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (matchingExpenses.length >= 3) {
      const intervals = []
      for (let i = 1; i < matchingExpenses.length; i++) {
        const days = (new Date(matchingExpenses[i].date).getTime() - new Date(matchingExpenses[i-1].date).getTime()) / (1000 * 60 * 60 * 24)
        intervals.push(days)
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      if (avgInterval >= 25 && avgInterval <= 35) { // Monthly pattern
        patterns.push({
          description: matchingExpenses[0].description,
          amount: matchingExpenses[0].amount,
          frequency: 'monthly'
        })
      }
    }
  })

  return patterns
}

function generatePatternInsights(patterns: any) {
  const insights = []

  if (patterns.dailySpending.averageDaily > 2000) {
    insights.push('Your daily spending is quite high. Consider meal prepping or using cash instead of cards for smaller purchases.')
  }

  const volatileCategory = patterns.categoryTrends.find(cat => cat.volatility > 0.5)
  if (volatileCategory) {
    insights.push(`${volatileCategory.category} spending is highly variable. This might indicate inconsistent budgeting or seasonal factors.`)
  }

  return insights
}

function generatePatternRecommendations(patterns: any) {
  const recommendations = []

  if (patterns.velocityAnalysis.acceleration > 0) {
    recommendations.push('Your spending is accelerating. Consider implementing a spending freeze for non-essential items.')
  }

  if (patterns.seasonalTrends.peakSeason) {
    const [month, amount] = patterns.seasonalTrends.peakSeason
    recommendations.push(`Build an emergency fund for ${getMonthName(month)} when your spending typically peaks at ₹${amount.toFixed(0)}.`)
  }

  return recommendations
}