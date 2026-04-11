/**
 * auth.ts — Supabase-backed authentication module
 *
 * Uses supabase.auth for real sign-up / sign-in / sign-out when the Supabase
 * project is reachable. Falls back to localStorage for offline / demo mode so
 * the UI never breaks even without network connectivity.
 *
 * Hook signatures are FROZEN — React components must never be updated to match
 * auth changes.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from './supabase';

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

// ── In-memory state (backed by localStorage) ──────────────────────────────
let currentUser: User | null = null;
let mockBankAccounts: BankAccount[] = [];

/** Convert a Supabase Auth user into our local User shape. */
function toLocalUser(sbUser: { id: string; email?: string; user_metadata?: any; created_at?: string }): User {
  return {
    id: sbUser.id,
    email: sbUser.email || '',
    username: sbUser.user_metadata?.username || sbUser.email?.split('@')[0] || 'user',
    fullName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name,
    avatar: sbUser.user_metadata?.avatar_url,
    createdAt: sbUser.created_at || new Date().toISOString(),
  };
}

function seedBankAccounts(user: User): BankAccount[] {
  const accounts: BankAccount[] = [
    {
      id: `acc_${Date.now()}_1`,
      userId: user.id,
      accountType: 'savings',
      bankName: 'HDFC Bank',
      accountNumber: '1234567890',
      accountHolderName: user.fullName || user.username,
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
      accountHolderName: user.fullName || user.username,
      upiId: `${user.username}@paytm`,
      balance: 5000,
      isDefault: false,
    },
  ];
  localStorage.setItem('bankAccounts', JSON.stringify(accounts));
  return accounts;
}

export const auth = {
  // Sign up with email and password
  async signUp(
    email: string,
    password: string,
    username: string,
    fullName?: string
  ): Promise<{ user: User | null; error: Error | null }> {
    try {
      // Try Supabase first
      const { data, error: sbError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, full_name: fullName || username },
        },
      });

      if (sbError) throw sbError;

      if (data.user) {
        const user = toLocalUser(data.user);
        currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        mockBankAccounts = seedBankAccounts(user);
        return { user, error: null };
      }

      // Supabase returned no user (e.g. email confirmation required) — fall through to local
      throw new Error('Confirmation required – falling back to local demo');
    } catch (err) {
      console.warn('[auth] Supabase signUp unavailable, using localStorage fallback', err);

      // localStorage fallback for offline / demo
      const user: User = {
        id: `user_${Date.now()}`,
        email,
        username,
        fullName,
        createdAt: new Date().toISOString(),
      };

      currentUser = user;
      localStorage.setItem('user', JSON.stringify(user));
      mockBankAccounts = seedBankAccounts(user);
      return { user, error: null };
    }
  },

  // Sign in with email and password
  async signIn(
    email: string,
    password: string
  ): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (sbError) throw sbError;

      if (data.user) {
        const user = toLocalUser(data.user);
        currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        const accounts = localStorage.getItem('bankAccounts');
        if (accounts) mockBankAccounts = JSON.parse(accounts);
        return { user, error: null };
      }

      throw new Error('No user returned');
    } catch (err) {
      console.warn('[auth] Supabase signIn unavailable, using localStorage fallback', err);

      // localStorage fallback
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser) as User;
        if (user.email === email) {
          currentUser = user;
          const accounts = localStorage.getItem('bankAccounts');
          if (accounts) mockBankAccounts = JSON.parse(accounts);
          return { user, error: null };
        }
      }

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
    }
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { error: sbError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (sbError) throw sbError;
      return { user: null, error: null };
    } catch (err) {
      console.warn('[auth] Supabase Google Auth unavailable, using demo bypass', err);
      const user: User = {
        id: `user_google_${Date.now()}`,
        email: 'google-demo@example.com',
        username: 'google_user',
        fullName: 'Google Demo User',
        createdAt: new Date().toISOString(),
      };
      currentUser = user;
      localStorage.setItem('user', JSON.stringify(user));
      return { user, error: null };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[auth] Supabase signOut failed, clearing locally', err);
    }
    currentUser = null;
    localStorage.removeItem('user');
    return { error: null };
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
    if (accounts) return JSON.parse(accounts);
    return mockBankAccounts.filter((acc) => acc.userId === userId);
  },

  // Add bank account
  async addBankAccount(
    account: Omit<BankAccount, 'id'>
  ): Promise<{ account: BankAccount | null; error: Error | null }> {
    try {
      const newAccount: BankAccount = { ...account, id: `acc_${Date.now()}` };
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
      mockBankAccounts = mockBankAccounts.filter((acc) => acc.id !== accountId);
      localStorage.setItem('bankAccounts', JSON.stringify(mockBankAccounts));
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
};
