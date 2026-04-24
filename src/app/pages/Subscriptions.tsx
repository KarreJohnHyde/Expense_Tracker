import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Repeat, Calendar, DollarSign, ShieldCheck, Trash2, Edit2, Plus, TrendingUp, X, Save, CreditCard, FileText, AlertTriangle } from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { Skeleton } from '../components/ui/skeleton';
import { useSubscriptionsCRUD, Subscription } from '../lib/useSubscriptionsCRUD';
import { toast } from 'sonner';

const CATEGORIES = ['Entertainment', 'Software', 'Health', 'Finance', 'Shopping', 'Food', 'Transport', 'Utilities', 'Education', 'Other'];
const FREQUENCIES = ['Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Annual'];
const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash', 'Wallet', 'Auto-Debit'];

export default function Subscriptions() {
  const { formatCurrency } = useCurrency();
  const { subscriptions, loading, fetchSubscriptions, createSubscription, updateSubscription, deleteSubscription, clearAllSubscriptions } = useSubscriptionsCRUD();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'Monthly',
    category: 'Entertainment',
    description: '',
    paymentMethod: 'UPI',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'delete' | 'clearAll'; targetId?: string }>({
    open: false, type: 'delete',
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const monthlyTotal = subscriptions.reduce((sum, s) => {
    if (!s.is_active) return sum;
    const amt = s.amount || 0;
    switch (s.frequency) {
      case 'Weekly': return sum + amt * 4.33;
      case 'Monthly': return sum + amt;
      case 'Quarterly': return sum + amt / 3;
      case 'Half-Yearly': return sum + amt / 6;
      case 'Annual': return sum + amt / 12;
      default: return sum + amt;
    }
  }, 0);

  const resetForm = () => {
    setFormData({ name: '', amount: '', frequency: 'Monthly', category: 'Entertainment', description: '', paymentMethod: 'UPI', date: new Date().toISOString().split('T')[0], notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
    setTimeout(() => document.getElementById('sub-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const openEditForm = (sub: Subscription) => {
    setEditingId(sub.id);
    setFormData({
      name: sub.name,
      amount: sub.amount.toString(),
      frequency: sub.frequency,
      category: sub.category,
      description: sub.description || '',
      paymentMethod: sub.paymentMethod || 'UPI',
      date: sub.date || sub.last_billed?.split('T')[0] || new Date().toISOString().split('T')[0],
      notes: sub.notes || '',
    });
    setShowForm(true);
    setTimeout(() => document.getElementById('sub-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Subscription name is required'); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { toast.error('Enter a valid amount'); return; }

    try {
      if (editingId) {
        await updateSubscription(editingId, {
          name: formData.name,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          category: formData.category,
          description: formData.description,
          paymentMethod: formData.paymentMethod,
          date: formData.date,
          notes: formData.notes,
        });
      } else {
        await createSubscription({
          name: formData.name,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          category: formData.category,
          description: formData.description,
          paymentMethod: formData.paymentMethod,
          date: formData.date,
          notes: formData.notes,
        });
      }
      resetForm();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmAction = async () => {
    if (confirmModal.type === 'delete' && confirmModal.targetId) {
      await deleteSubscription(confirmModal.targetId);
    } else if (confirmModal.type === 'clearAll') {
      await clearAllSubscriptions();
    }
    setConfirmModal({ open: false, type: 'delete' });
  };

  if (loading && subscriptions.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Repeat className="size-7 text-blue-500" />
            </div>
            Subscription Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage recurring payments — add, edit, delete, or clear all subscriptions.
          </p>
        </div>
        <div className="flex gap-2">
          {subscriptions.length > 0 && (
            <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setConfirmModal({ open: true, type: 'clearAll' })}>
              <Trash2 className="size-4 mr-2" /> Clear All
            </Button>
          )}
          <Button onClick={openAddForm} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
            <Plus className="size-4" /> Add Subscription
          </Button>
        </div>
      </div>

      {/* Stats Card */}
      <Card className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/30">
        <CardContent className="p-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <CardDescription className="font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1"><TrendingUp className="size-4"/> Total Monthly Cost</CardDescription>
            <p className="text-4xl font-extrabold">{formatCurrency(monthlyTotal)} <span className="text-sm font-normal text-muted-foreground">/ month</span></p>
            <p className="text-xs text-muted-foreground mt-2">{subscriptions.filter(s => s.is_active).length} active · {subscriptions.length} total subscriptions</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Annual Estimate</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(monthlyTotal * 12)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card id="sub-form" className="border-2 border-blue-500/30 bg-blue-500/5 shadow-lg animate-fade-in-up">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl flex items-center gap-2">
                {editingId ? <Edit2 className="size-5 text-blue-500" /> : <Plus className="size-5 text-blue-500" />}
                {editingId ? 'Edit Subscription' : 'Add New Subscription'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="size-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sub-name" className="text-xs font-bold uppercase tracking-wider">Subscription Name *</Label>
                <Input id="sub-name" placeholder="e.g., Netflix, Spotify, Gym" className="mt-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="sub-amount" className="text-xs font-bold uppercase tracking-wider">Amount (₹) *</Label>
                <Input id="sub-amount" type="number" placeholder="0.00" className="mt-1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
            </div>
            <div>
              <Label htmlFor="sub-desc" className="text-xs font-bold uppercase tracking-wider">Description</Label>
              <Input id="sub-desc" placeholder="Brief description of this subscription..." className="mt-1" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Category</Label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Frequency</Label>
                <select value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm">
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Payment Method</Label>
                <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Date</Label>
                <Input type="date" className="mt-1" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider">Notes (optional)</Label>
              <Input placeholder="Any extra notes..." className="mt-1" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-2 border-t">
              <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-bold shadow-md">
                <Save className="mr-2 size-4" /> {editingId ? 'Update Subscription' : 'Create Subscription'}
              </Button>
              <Button variant="outline" onClick={resetForm} className="h-11">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {subscriptions.length > 0 ? subscriptions.map((sub) => (
          <Card key={sub.id} className={`hover:shadow-lg transition-all hover:scale-[1.01] border-2 ${sub.is_active ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/20 opacity-60'}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2" title={sub.name}>
                  {sub.name}
                  {sub.is_active && <ShieldCheck className="size-4 text-emerald-500 shrink-0" />}
                </CardTitle>
                <Badge variant={sub.is_active ? 'default' : 'outline'} className="shrink-0 text-xs">{sub.category}</Badge>
              </div>
              {sub.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{sub.description}</p>}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(sub.amount)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Repeat className="size-3"/> {sub.frequency}</span>
                <span className="flex items-center gap-1"><Calendar className="size-3"/> {sub.date || sub.last_billed?.split('T')[0] || '—'}</span>
                <span className="flex items-center gap-1"><CreditCard className="size-3"/> {sub.paymentMethod || 'UPI'}</span>
                {sub.notes && <span className="flex items-center gap-1 col-span-2"><FileText className="size-3"/> {sub.notes}</span>}
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => openEditForm(sub)}>
                  <Edit2 className="size-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="destructive" className="flex-1 h-9" onClick={() => setConfirmModal({ open: true, type: 'delete', targetId: sub.id })}>
                  <Trash2 className="size-3 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full py-16 text-center border-dashed border-2 rounded-2xl">
            <Repeat className="size-14 mx-auto text-muted-foreground opacity-40 mb-4" />
            <p className="text-xl font-semibold">No subscriptions yet</p>
            <p className="text-sm text-muted-foreground mb-6">Click the button above to add your first subscription.</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal({ open: false, type: 'delete' })}>
          <Card className="w-full max-w-sm shadow-2xl border-red-200" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">
                  {confirmModal.type === 'clearAll' ? 'Clear All Subscriptions' : 'Delete Subscription'}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {confirmModal.type === 'clearAll'
                  ? 'Are you sure you want to remove ALL subscriptions? This action cannot be undone.'
                  : 'Are you sure you want to delete this subscription? This cannot be undone.'}
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setConfirmModal({ open: false, type: 'delete' })}>Cancel</Button>
                <Button onClick={handleConfirmAction} className="bg-red-600 hover:bg-red-700 text-white">
                  <Trash2 className="mr-2 size-4" />
                  Yes, {confirmModal.type === 'clearAll' ? 'Clear All' : 'Delete'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
