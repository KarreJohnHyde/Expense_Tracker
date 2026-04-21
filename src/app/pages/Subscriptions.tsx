import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Repeat, Calendar, DollarSign, BrainCircuit, ShieldCheck, Info, Trash2, Edit2, Plus, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { useCurrency } from '../lib/currency';
import { Skeleton } from '../components/ui/skeleton';
import { useSubscriptionsCRUD } from '../lib/useSubscriptionsCRUD';
import { toast } from 'sonner';

export default function Subscriptions() {
  const { formatCurrency } = useCurrency();
  const { subscriptions, loading, fetchSubscriptions, createSubscription, updateSubscription, deleteSubscription } = useSubscriptionsCRUD();
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', amount: '', frequency: 'Monthly', category: 'Entertainment', notes: '' });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    await fetchSubscriptions();
    // Calculate total from detected or stored subscriptions
    const result = await api.getExpenses();
    const expenses = result.expenses || [];
    
    const subMap: Record<string, { count: number, amounts: number[] }> = {};
    expenses.forEach((e: any) => {
      const key = e.description?.toLowerCase().trim();
      if (!key) return;
      if (!subMap[key]) subMap[key] = { count: 0, amounts: [] };
      subMap[key].count++;
      subMap[key].amounts.push(Number(e.amount));
    });
    
    let total = 0;
    const SUBSCRIPTION_KEYWORDS = ['netflix', 'spotify', 'prime', 'apple', 'google', 'recharge', 'bill', 'premium', 'plus', 'pro', 'membership', 'sip', 'insurance'];
    for (const [name, data] of Object.entries(subMap)) {
      const isKeywordMatch = SUBSCRIPTION_KEYWORDS.some(kw => name.includes(kw));
      if ((data.count > 1 || isKeywordMatch) && data.amounts.length > 0) {
        const avgAmount = data.amounts.reduce((a,b) => a+b, 0) / data.amounts.length;
        total += avgAmount;
      }
    }
    setMonthlyTotal(total);
  };

  const handleSaveSubscription = async () => {
    if (!formData.name.trim() || !formData.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (editingId) {
        await updateSubscription(editingId, {
          name: formData.name,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          category: formData.category,
          notes: formData.notes,
        });
        setEditingId(null);
      } else {
        await createSubscription({
          name: formData.name,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          category: formData.category,
          notes: formData.notes,
        });
      }
      setFormData({ name: '', amount: '', frequency: 'Monthly', category: 'Entertainment', notes: '' });
      setShowNewForm(false);
      await loadSubscriptions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        await deleteSubscription(id);
        await loadSubscriptions();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      <div className="flex flex-col gap-2 relative z-10 glass p-6 rounded-2xl border">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Repeat className="size-8 text-blue-500" /> Subscription Manager
        </h1>
        <p className="text-muted-foreground w-full md:w-2/3">
          Manage recurring payments with full CRUD operations. Add, edit, or delete subscriptions.
        </p>
      </div>

      {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
          </div>
      ) : (
      <>
          <Card className="bg-gradient-to-r from-blue-500/10 to-transparent border-blue-500/30">
              <CardContent className="p-6 flex justify-between items-center">
                 <div>
                    <CardDescription className="font-semibold text-blue-600 mb-1 flex items-center gap-1"><TrendingUp className="size-4"/> Total Monthly Subscriptions</CardDescription>
                    <p className="text-4xl font-extrabold">{formatCurrency(monthlyTotal)} <span className="text-sm font-normal text-muted-foreground">/ month</span></p>
                    <p className="text-xs text-muted-foreground mt-2">{subscriptions.length} active subscriptions</p>
                 </div>
                 <Button onClick={() => setShowNewForm(true)} className="gap-2">
                   <Plus className="size-4" /> Add Subscription
                 </Button>
              </CardContent>
          </Card>

          {/* New/Edit Form */}
          {showNewForm || editingId && (
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle>{editingId ? 'Edit Subscription' : 'Add New Subscription'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Subscription Name</Label>
                    <Input id="name" placeholder="e.g., Netflix, Spotify" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <Label htmlFor="amount">Monthly Amount (₹)</Label>
                    <Input id="amount" type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </div>
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <select value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                      <option>Monthly</option>
                      <option>Quarterly</option>
                      <option>Annual</option>
                      <option>Weekly</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                      <option>Entertainment</option>
                      <option>Software</option>
                      <option>Health</option>
                      <option>Finance</option>
                      <option>Shopping</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input id="notes" placeholder="Add any notes..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveSubscription} className="flex-1">{editingId ? 'Update' : 'Create'}</Button>
                  <Button variant="outline" onClick={() => { setShowNewForm(false); setEditingId(null); setFormData({ name: '', amount: '', frequency: 'Monthly', category: 'Entertainment', notes: '' }); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {subscriptions && subscriptions.length > 0 ? subscriptions.map((sub: any) => (
                  <Card key={sub.id} className={`hover:shadow-lg transition-all hover:scale-[1.02] ${sub.is_active ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/20'}`}>
                      <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                             <CardTitle className="text-lg overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2" title={sub.name}>
                                {sub.name} 
                                {sub.is_active && <ShieldCheck className="size-4 text-emerald-500" />}
                             </CardTitle>
                             <Badge variant={sub.is_active ? 'default' : 'outline'} className="shrink-0">{sub.category}</Badge>
                          </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                             {formatCurrency(sub.amount)}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                             <span className="flex items-center gap-1"><Repeat className="size-3"/> {sub.frequency}</span>
                             <span className="flex items-center gap-1"><Calendar className="size-3"/> {sub.last_billed?.split('T')[0]}</span>
                          </div>
                          {sub.notes && <p className="text-xs text-muted-foreground italic">{sub.notes}</p>}
                          <div className="flex gap-2 pt-2 border-t">
                             <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingId(sub.id); setFormData({ name: sub.name, amount: sub.amount.toString(), frequency: sub.frequency, category: sub.category, notes: sub.notes || '' }); }}>
                               <Edit2 className="size-3 mr-1" /> Edit
                             </Button>
                             <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDeleteSubscription(sub.id)}>
                               <Trash2 className="size-3 mr-1" /> Delete
                             </Button>
                          </div>
                      </CardContent>
                  </Card>
              )) : (
                  <div className="col-span-full py-12 text-center border-dashed border-2 rounded-xl">
                      <Repeat className="size-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                      <p className="text-lg font-medium">No subscriptions yet</p>
                      <p className="text-sm text-muted-foreground mb-4">Create your first subscription or let AI auto-detect from your expenses.</p>
                      <Button onClick={() => setShowNewForm(true)}><Plus className="mr-2 size-4" /> Add Subscription</Button>
                  </div>
              )}
          </div>
      </>
      )}
    </div>
  );
}
