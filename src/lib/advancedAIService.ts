import { supabase } from './supabaseClient'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ExpenseContext {
  userId: string
  expenses: any[]
  mlInsights?: any
}

export interface AdvancedAIResponse {
  response: string
  functionCalled?: boolean
  usage?: any
  analysis?: any
  insights?: any
}

class AdvancedAIService {
  private conversationHistory: ConversationMessage[] = []
  private maxHistoryLength = 20

  async chat(message: string, context: ExpenseContext): Promise<AdvancedAIResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('advanced-ai', {
        body: {
          action: 'chat',
          message,
          context: {
            userId: context.userId,
            expenses: context.expenses,
            recentMessages: this.conversationHistory.slice(-10).map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            mlInsights: context.mlInsights
          }
        }
      })

      if (error) throw error

      // Add to conversation history
      this.addToHistory('user', message)
      this.addToHistory('assistant', data.response)

      return data
    } catch (error) {
      console.error('Advanced AI chat error:', error)
      return {
        response: "I'm sorry, I'm having trouble connecting to my advanced analysis systems right now. Please try again in a moment.",
        functionCalled: false
      }
    }
  }

  async analyzeExpenses(context: ExpenseContext): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('advanced-ai', {
        body: {
          action: 'analyze',
          context
        }
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Advanced AI analysis error:', error)
      return null
    }
  }

  async getInsights(context: ExpenseContext): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('advanced-ai', {
        body: {
          action: 'insights',
          context
        }
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Advanced AI insights error:', error)
      return null
    }
  }

  private addToHistory(role: 'user' | 'assistant', content: string) {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    })

    // Keep only recent messages
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength)
    }
  }

  clearHistory() {
    this.conversationHistory = []
  }

  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory]
  }

  // Helper methods for common AI queries
  async getSpendingSummary(context: ExpenseContext): Promise<string> {
    const message = "Give me a comprehensive summary of my spending patterns, including key insights and recommendations."
    const response = await this.chat(message, context)
    return response.response
  }

  async getBudgetRecommendations(context: ExpenseContext, income?: number): Promise<string> {
    const message = income
      ? `Create a personalized budget plan for me with a monthly income of ₹${income}. Include specific recommendations and implementation steps.`
      : "Analyze my spending and create a personalized budget plan with recommendations."
    const response = await this.chat(message, context)
    return response.response
  }

  async detectAnomalies(context: ExpenseContext): Promise<string> {
    const message = "Analyze my expenses for any unusual or suspicious spending patterns. Flag potential anomalies and provide security recommendations."
    const response = await this.chat(message, context)
    return response.response
  }

  async getFinancialForecast(context: ExpenseContext): Promise<string> {
    const message = "Based on my spending history, provide a financial forecast for the next month including expected expenses, savings potential, and financial goals recommendations."
    const response = await this.chat(message, context)
    return response.response
  }

  async getCategoryAnalysis(context: ExpenseContext): Promise<string> {
    const message = "Provide a detailed analysis of my spending by category, including trends, patterns, and optimization opportunities."
    const response = await this.chat(message, context)
    return response.response
  }

  async getBehavioralInsights(context: ExpenseContext): Promise<string> {
    const message = "Analyze my spending behavior from a behavioral economics perspective. Identify habits, biases, and provide psychological insights with actionable recommendations."
    const response = await this.chat(message, context)
    return response.response
  }
}

export const advancedAI = new AdvancedAIService()