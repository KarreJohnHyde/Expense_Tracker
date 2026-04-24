import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { auth } from './auth';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  description?: string;
  paymentMethod?: string;
  date?: string;
  last_billed?: string;
  next_due?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const BASE_STORAGE_KEY = 'expenseai_subscriptions';

function getStorageKey(): string {
  const user = auth.getCurrentUser();
  if (!user || user.email === 'demo@expense-tracker.com') {
    return BASE_STORAGE_KEY;
  }
  return `${BASE_STORAGE_KEY}_${user.id}`;
}

function loadFromStorage(): Subscription[] {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(subs: Subscription[]) {
  localStorage.setItem(getStorageKey(), JSON.stringify(subs));
}

export function useSubscriptionsCRUD() {
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  // ✅ READ all subscriptions
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = loadFromStorage();
      setSubscriptions(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ CREATE subscription
  const createSubscription = useCallback(
    async (data: Omit<Subscription, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        const newSub: Subscription = {
          ...data,
          id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          is_active: true,
          created_at: now,
          updated_at: now,
          last_billed: data.date || now.split('T')[0],
        };
        const all = loadFromStorage();
        all.push(newSub);
        saveToStorage(all);
        setSubscriptions(all);
        toast.success('✅ Subscription created!');
        return newSub;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ✅ UPDATE subscription
  const updateSubscription = useCallback(
    async (id: string, updates: Partial<Subscription>) => {
      setLoading(true);
      try {
        const all = loadFromStorage();
        const idx = all.findIndex(s => s.id === id);
        if (idx === -1) throw new Error('Subscription not found');
        all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
        saveToStorage(all);
        setSubscriptions(all);
        toast.success('✅ Subscription updated!');
        return all[idx];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ✅ DELETE subscription
  const deleteSubscription = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const all = loadFromStorage().filter(s => s.id !== id);
        saveToStorage(all);
        setSubscriptions(all);
        toast.success('✅ Subscription deleted!');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ✅ CLEAR ALL
  const clearAllSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      saveToStorage([]);
      setSubscriptions([]);
      toast.success('✅ All subscriptions cleared!');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    subscriptions,
    createSubscription,
    fetchSubscriptions,
    updateSubscription,
    deleteSubscription,
    clearAllSubscriptions,
  };
}
