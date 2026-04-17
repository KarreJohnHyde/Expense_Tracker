export interface WalletTransaction {
  id: string;
  wallet: WalletName;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category?: string;
  date: string;
  reference?: string;
}

export type WalletName = 'PhonePe' | 'Paytm' | 'GPay' | 'SuperPay' | 'CRED';

export const WALLET_LIST: { name: WalletName; color: string; icon: string }[] = [
  { name: 'PhonePe', color: '#5f259f', icon: '📱' },
  { name: 'Paytm', color: '#00baf2', icon: '💳' },
  { name: 'GPay', color: '#4285f4', icon: '🅖' },
  { name: 'SuperPay', color: '#ff6b00', icon: '⚡' },
  { name: 'CRED', color: '#1a1a2e', icon: '💎' },
];

const STORAGE_KEY = 'wallets:transactions';

export function getWalletTransactions(): WalletTransaction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveWalletTransaction(txn: Omit<WalletTransaction, 'id'>): WalletTransaction {
  const transactions = getWalletTransactions();
  const newTxn: WalletTransaction = { ...txn, id: crypto.randomUUID() };
  transactions.unshift(newTxn);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  window.dispatchEvent(new Event('wallets-changed'));
  return newTxn;
}

export function deleteWalletTransaction(id: string) {
  const transactions = getWalletTransactions().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  window.dispatchEvent(new Event('wallets-changed'));
}

export function getWalletBalance(wallet: WalletName): { balance: number; totalCredit: number; totalDebit: number } {
  const txns = getWalletTransactions().filter(t => t.wallet === wallet);
  const totalCredit = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebit = txns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  return { balance: totalCredit - totalDebit, totalCredit, totalDebit };
}
