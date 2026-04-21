import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Subscription {
  id?: string;
  user_id?: string;
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

// ✅ CREATE subscription
async function createSubscription(userId: string, data: Subscription) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: userId,
        name: data.name,
        amount: data.amount,
        frequency: data.frequency || 'Monthly',
        category: data.category || 'Entertainment',
        last_billed: data.last_billed || new Date().toISOString().split('T')[0],
        next_due: data.next_due || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_active: data.is_active !== false,
        notes: data.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select();

    if (error) throw error;
    return { success: true, data: subscription };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ✅ READ subscriptions (get all or by ID)
async function getSubscriptions(userId: string, subscriptionId?: string) {
  try {
    let query = supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (subscriptionId) {
      query = query.eq('id', subscriptionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ✅ UPDATE subscription
async function updateSubscription(userId: string, subscriptionId: string, updates: Partial<Subscription>) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    if (!subscription || subscription.length === 0) {
      throw new Error('Subscription not found or unauthorized');
    }
    return { success: true, data: subscription };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ✅ DELETE subscription
async function deleteSubscription(userId: string, subscriptionId: string) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, message: 'Subscription deleted successfully' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ✅ BULK operations
async function bulkUpdateSubscriptions(userId: string, updates: Record<string, Partial<Subscription>>) {
  try {
    const promises = Object.entries(updates).map(([id, data]) =>
      supabase
        .from('subscriptions')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
    );

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      throw new Error(`Bulk update failed for ${errors.length} items`);
    }
    return { success: true, message: `Updated ${results.length} subscriptions` };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ✅ STATS - Get subscription statistics
async function getSubscriptionStats(userId: string) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('amount, frequency, is_active')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    const stats = {
      total_subscriptions: subscriptions?.length || 0,
      active_subscriptions: subscriptions?.filter(s => s.is_active).length || 0,
      monthly_total: subscriptions
        ?.filter(s => s.frequency === 'Monthly' || s.frequency === 'monthly')
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0,
      annual_total: subscriptions
        ?.filter(s => s.frequency === 'Annual' || s.frequency === 'annual')
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0,
      yearly_estimated: 0,
    };

    stats.yearly_estimated = (stats.monthly_total * 12) + stats.annual_total;

    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ✅ Main handler
serve(async (req: Request) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Extract authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    let response: any = { error: 'Invalid endpoint' };

    // ✅ CREATE - POST /subscriptions
    if (method === 'POST' && pathname === '/subscriptions-crud') {
      const body = await req.json();
      response = await createSubscription(userId, body);
    }

    // ✅ READ - GET /subscriptions-crud or /subscriptions-crud/:id
    else if (method === 'GET' && pathname.startsWith('/subscriptions-crud')) {
      const subscriptionId = pathname.split('/').pop();
      const actualId = subscriptionId === 'subscriptions-crud' ? undefined : subscriptionId;
      response = await getSubscriptions(userId, actualId);
    }

    // ✅ READ STATS - GET /subscriptions-crud/stats
    else if (method === 'GET' && pathname.endsWith('/stats')) {
      response = await getSubscriptionStats(userId);
    }

    // ✅ UPDATE - PUT /subscriptions-crud/:id
    else if (method === 'PUT' && pathname.startsWith('/subscriptions-crud')) {
      const subscriptionId = pathname.split('/').pop();
      if (!subscriptionId || subscriptionId === 'subscriptions-crud') {
        response = { error: 'Subscription ID required' };
      } else {
        const body = await req.json();
        response = await updateSubscription(userId, subscriptionId, body);
      }
    }

    // ✅ DELETE - DELETE /subscriptions-crud/:id
    else if (method === 'DELETE' && pathname.startsWith('/subscriptions-crud')) {
      const subscriptionId = pathname.split('/').pop();
      if (!subscriptionId || subscriptionId === 'subscriptions-crud') {
        response = { error: 'Subscription ID required' };
      } else {
        response = await deleteSubscription(userId, subscriptionId);
      }
    }

    // ✅ BULK UPDATE - PUT /subscriptions-crud/bulk
    else if (method === 'PUT' && pathname.endsWith('/bulk')) {
      const body = await req.json();
      response = await bulkUpdateSubscriptions(userId, body);
    }

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
