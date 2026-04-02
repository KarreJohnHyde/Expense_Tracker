import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  avatar?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  userId: string;
  accountType: 'savings' | 'current' | 'credit_card' | 'debit_card' | 'upi' | 'net_banking';
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode?: string;
  upiId?: string;
  cardNumber?: string;
  cvv?: string;
  expiryDate?: string;
  balance: number;
  isDefault: boolean;
}

// Mock authentication for prototype
let currentUser: User | null = null;
let mockBankAccounts: BankAccount[] = [];

export const auth = {
  // Sign up with email and password
  async signUp(email: string, password: string, username: string, fullName?: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      // In production, this would use Supabase Auth
      // For now, we'll create a mock user
      const user: User = {
        id: `user_${Date.now()}`,
        email,
        username,
        fullName,
        createdAt: new Date().toISOString(),
      };
      
      currentUser = user;
      localStorage.setItem('user', JSON.stringify(user));
      
      // Create default accounts
      mockBankAccounts = [
        {
          id: `acc_${Date.now()}_1`,
          userId: user.id,
          accountType: 'savings',
          bankName: 'HDFC Bank',
          accountNumber: '1234567890',
          accountHolderName: fullName || username,
          ifscCode: 'HDFC0001234',
          balance: 50000,
          isDefault: true,
        },
        {
          id: `acc_${Date.now()}_2`,
          userId: user.id,
          accountType: 'upi',
          bankName: 'PhonePe',
          accountNumber: '',
          accountHolderName: fullName || username,
          upiId: `${username}@paytm`,
          balance: 5000,
          isDefault: false,
        },
      ];
      localStorage.setItem('bankAccounts', JSON.stringify(mockBankAccounts));
      
      return { user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      // Check if user exists in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser) as User;
        if (user.email === email) {
          currentUser = user;
          const accounts = localStorage.getItem('bankAccounts');
          if (accounts) {
            mockBankAccounts = JSON.parse(accounts);
          }
          return { user, error: null };
        }
      }
      
      // Create demo user for testing
      const user: User = {
        id: `user_${Date.now()}`,
        email,
        username: email.split('@')[0],
        fullName: 'Demo User',
        createdAt: new Date().toISOString(),
      };
      
      currentUser = user;
      localStorage.setItem('user', JSON.stringify(user));
      
      return { user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    try {
      currentUser = null;
      localStorage.removeItem('user');
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  // Get current user
  getCurrentUser(): User | null {
    if (currentUser) return currentUser;
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      return currentUser;
    }
    
    return null;
  },

  // Get user bank accounts
  getBankAccounts(userId: string): BankAccount[] {
    const accounts = localStorage.getItem('bankAccounts');
    if (accounts) {
      return JSON.parse(accounts);
    }
    return mockBankAccounts.filter(acc => acc.userId === userId);
  },

  // Add bank account
  async addBankAccount(account: Omit<BankAccount, 'id'>): Promise<{ account: BankAccount | null; error: Error | null }> {
    try {
      const newAccount: BankAccount = {
        ...account,
        id: `acc_${Date.now()}`,
      };
      
      mockBankAccounts.push(newAccount);
      localStorage.setItem('bankAccounts', JSON.stringify(mockBankAccounts));
      
      return { account: newAccount, error: null };
    } catch (error) {
      return { account: null, error: error as Error };
    }
  },

  // Delete bank account
  async deleteBankAccount(accountId: string): Promise<{ error: Error | null }> {
    try {
      mockBankAccounts = mockBankAccounts.filter(acc => acc.id !== accountId);
      localStorage.setItem('bankAccounts', JSON.stringify(mockBankAccounts));
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
};
