import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';

interface Subscription {
  id?: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  last_billed?: string;
  next_due?: string;
  is_active?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  monthly_total: number;
  annual_total: number;
  yearly_estimated: number;
}

export function useSubscriptionsCRUD() {
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);

  // ✅ Get authorization token
  const getAuthToken = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('Not authenticated');
    return session.access_token;
  }, []);

  // ✅ Make API call to Edge Function
  const apiCall = useCallback(
    async (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      endpoint: string,
      body?: any
    ) => {
      try {
        setLoading(true);
        const token = await getAuthToken();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscriptions-crud${endpoint}`;

        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };

        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'API error');
        }

        return await response.json();
      } catch (error) {
        console.error('API error:', error);
        toast.error((error as Error).message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [getAuthToken]
  );

  // ✅ CREATE subscription
  const createSubscription = useCallback(
    async (data: Subscription) => {
      try {
        const result = await apiCall('POST', '', data);
        toast.success('✅ Subscription created successfully!');
        await fetchSubscriptions();
        return result;
      } catch (error) {
        console.error('Create failed:', error);
        throw error;
      }
    },
    [apiCall]
  );

  // ✅ READ subscriptions
  const fetchSubscriptions = useCallback(async () => {
    try {
      const result = await apiCall('GET', '');
      if (result.success) {
        setSubscriptions(result.data || []);
        return result.data;
      }
    } catch (error) {
      console.error('Fetch failed:', error);
    }
  }, [apiCall]);

  // ✅ READ specific subscription
  const getSubscription = useCallback(
    async (id: string) => {
      try {
        const result = await apiCall('GET', `/${id}`);
        return result.success ? result.data?.[0] : null;
      } catch (error) {
        console.error('Get failed:', error);
      }
    },
    [apiCall]
  );

  // ✅ UPDATE subscription
  const updateSubscription = useCallback(
    async (id: string, updates: Partial<Subscription>) => {
      try {
        const result = await apiCall('PUT', `/${id}`, updates);
        toast.success('✅ Subscription updated successfully!');
        await fetchSubscriptions();
        return result;
      } catch (error) {
        console.error('Update failed:', error);
        throw error;
      }
    },
    [apiCall, fetchSubscriptions]
  );

  // ✅ DELETE subscription
  const deleteSubscription = useCallback(
    async (id: string) => {
      try {
        const result = await apiCall('DELETE', `/${id}`);
        toast.success('✅ Subscription deleted successfully!');
        await fetchSubscriptions();
        return result;
      } catch (error) {
        console.error('Delete failed:', error);
        toast.error('Failed to delete subscription');
        throw error;
      }
    },
    [apiCall, fetchSubscriptions]
  );

  // ✅ GET stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await apiCall('GET', '/stats');
      if (result.success) {
        setStats(result.data);
        return result.data;
      }
    } catch (error) {
      console.error('Stats fetch failed:', error);
    }
  }, [apiCall]);

  // ✅ BULK UPDATE
  const bulkUpdateSubscriptions = useCallback(
    async (updates: Record<string, Partial<Subscription>>) => {
      try {
        const result = await apiCall('PUT', '/bulk', updates);
        toast.success('✅ Subscriptions updated!');
        await fetchSubscriptions();
        return result;
      } catch (error) {
        console.error('Bulk update failed:', error);
        throw error;
      }
    },
    [apiCall, fetchSubscriptions]
  );

  return {
    loading,
    subscriptions,
    stats,
    createSubscription,
    fetchSubscriptions,
    getSubscription,
    updateSubscription,
    deleteSubscription,
    fetchStats,
    bulkUpdateSubscriptions,
  };
}
