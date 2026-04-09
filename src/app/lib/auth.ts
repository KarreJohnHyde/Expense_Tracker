/**
 * auth.ts — AWS Cognito-ready authentication module
 *
 * Architecture: LocalStack-compatible mock with Cognito interface parity.
 * To enable real Cognito: set VITE_AWS_USER_POOL_ID + VITE_AWS_USER_POOL_CLIENT_ID
 * and uncomment the aws-amplify calls below once `pnpm add aws-amplify` completes.
 *
 * Hook signatures are FROZEN — React components must never be updated to match auth changes.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Cognito config (prepared for Amplify Gen2 when package is available) ──
const _meta = (import.meta as any).env || {};
const COGNITO_USER_POOL_ID = (_meta.VITE_AWS_USER_POOL_ID as string) || '';
const COGNITO_CLIENT_ID = (_meta.VITE_AWS_USER_POOL_CLIENT_ID as string) || '';
const COGNITO_ENABLED = !!(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);

// Placeholder for future dynamic import of aws-amplify
// import { Amplify } from 'aws-amplify';
// import { signUp as cognitoSignUp, signIn as cognitoSignIn, signOut as cognitoSignOut, getCurrentUser as cognitoGetCurrentUser } from 'aws-amplify/auth';
// if (COGNITO_ENABLED) Amplify.configure({ Auth: { Cognito: { userPoolId: COGNITO_USER_POOL_ID, userPoolClientId: COGNITO_CLIENT_ID } } });

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

export const auth = {
  // Sign up with email and password
  async signUp(
    email: string,
    _password: string,
    username: string,
    fullName?: string
  ): Promise<{ user: User | null; error: Error | null }> {
    try {
      if (COGNITO_ENABLED) {
        // await cognitoSignUp({ username: email, password: _password, options: { userAttributes: { email, name: fullName || username } } });
      }

      const user: User = {
        id: `user_${Date.now()}`,
        email,
        username,
        fullName,
        createdAt: new Date().toISOString(),
      };

      currentUser = user;
      localStorage.setItem('user', JSON.stringify(user));

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
  async signIn(
    email: string,
    _password: string
  ): Promise<{ user: User | null; error: Error | null }> {
    try {
      if (COGNITO_ENABLED) {
        // await cognitoSignIn({ username: email, password: _password });
      }

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
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    try {
      if (COGNITO_ENABLED) {
        // await cognitoSignOut();
      }
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
    if (COGNITO_ENABLED) {
      // cognitoGetCurrentUser().catch(() => null);
    }
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
