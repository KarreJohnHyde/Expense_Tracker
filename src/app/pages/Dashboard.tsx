import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AddExpenseDialog } from '../components/AddExpenseDialog';
import { ExpenseList } from '../components/ExpenseList';
import { AIInsights } from '../components/AIInsights';
import { StatsCards } from '../components/StatsCards';
import { SpendingChart } from '../components/SpendingChart';
import { VoiceExpenseInput } from '../components/VoiceExpenseInput';
import { ForecastCard } from '../components/ForecastCard';
import { SavingsAdvisor } from '../components/SavingsAdvisor';
import { FinancialTicker } from '../components/FinancialTicker';
import { api } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search, FileText, FileSpreadsheet, Sparkles, Calendar, Camera, TrendingUp, Zap, Filter, Repeat, ArrowRight, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { auth } from '../lib/auth';
import { useNavigate } from 'react-router';
import { EXPENSE_CATEGORIES } from '../lib/expenseSchema';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod?: string;
  source?: string;
  scanData?: {
    type: 'ocr_receipt' | 'qr' | 'barcode';
    rawText: string;
    format?: string;
    capturedAt: string;
  } | null;
  receiptImage?: string | null;
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [voicePrefillData, setVoicePrefillData] = useState<any>(null);
  const [unconfirmedCount, setUnconfirmedCount] = useState(0);
  const [trustScore, setTrustScore] = useState(100);

  const navigate = useNavigate();
  const user = auth.getCurrentUser();
  const now = new Date();
  const greetingKey = now.getHours() < 12 ? 'dashboard.greeting' : now.getHours() < 17 ? 'dashboard.greeting_afternoon' : 'dashboard.greeting_evening';
  const greeting = t(greetingKey);

  useEffect(() => {
    loadExpenses();
    window.addEventListener('expenseai:edge:expenses_updated', loadExpenses);
    return () => window.removeEventListener('expenseai:edge:expenses_updated', loadExpenses);
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchQuery, categoryFilter, dateFilter, paymentFilter]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.getExpenses();
      const expensesList = resp.expenses || [];
      setExpenses(expensesList);
      checkPotentialSubscriptions(expensesList);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load expenses';
      toast.error(msg);
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPotentialSubscriptions = useCallback((expenses: Expense[]) => {
    const subMap: Record<string, number> = {};
    const SUBSCRIPTION_KEYWORDS = ['netflix', 'spotify', 'prime', 'apple', 'google', 'recharge', 'bill', 'premium', 'plus', 'pro', 'membership', 'sip', 'insurance'];
    
    expenses.forEach(e => {
        const key = e.description?.toLowerCase().trim();
        if (!key) return;
        subMap[key] = (subMap[key] || 0) + 1;
    });

    let potential = 0;
    for (const [name, count] of Object.entries(subMap)) {
        const isKeyword = SUBSCRIPTION_KEYWORDS.some(kw => name.includes(kw));
        const confirmed = localStorage.getItem(`sub_confirmed_${name}`) === 'true';
        if ((count > 1 || isKeyword) && !confirmed) potential++;
    }
    setUnconfirmedCount(potential);

    const verified = expenses.filter(e => e.receiptImage).length;
    const score = expenses.length > 0 ? (verified / expenses.length) * 100 : 100;
    setTrustScore(Math.round(score));
  }, []);

  const filterExpenses = () => {
    let filtered = [...expenses];

    if (searchQuery) {
      filtered = filtered.filter(exp =>
        exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(exp => exp.category === categoryFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(exp => exp.paymentMethod === paymentFilter);
    }

    if (dateFilter !== 'all') {
      const nowDate = new Date();
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        switch (dateFilter) {
          case 'today':
            return expDate.toDateString() === nowDate.toDateString();
          case 'week': {
            const weekAgo = new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            return expDate >= weekAgo;
          }
          case 'month':
            return expDate.getMonth() === nowDate.getMonth() && expDate.getFullYear() === nowDate.getFullYear();
          case 'year':
            return expDate.getFullYear() === nowDate.getFullYear();
          default:
            return true;
        }
      });
    }

    setFilteredExpenses(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Payment Method'];
    const csvData = filteredExpenses.map(exp => [
      new Date(exp.date).toLocaleDateString(),
      exp.description,
      exp.amount,
      exp.category,
      exp.paymentMethod,
    ]);
    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Expenses exported successfully');
  };

  const exportToJSON = () => {
    const json = JSON.stringify(filteredExpenses, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Expenses exported successfully');
  };

  const categories = [...EXPENSE_CATEGORIES];
  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking'];

  // ── Skeleton loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Hero skeleton */}
        <div className="skeleton h-36 rounded-2xl" />
        {/* Stats grid skeleton */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        {/* Bento skeleton */}
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}
        >
          <div className="skeleton h-72 rounded-2xl" style={{ gridColumn: 'span 8' }} />
          <div className="skeleton h-72 rounded-2xl" style={{ gridColumn: 'span 4' }} />
          <div className="skeleton h-80 rounded-2xl" style={{ gridColumn: 'span 6' }} />
          <div className="skeleton h-80 rounded-2xl" style={{ gridColumn: 'span 6' }} />
        </div>
      </div>
    );
  }

  const totalThisMonth = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);

  const monthlyTransactions = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || dateFilter !== 'all' || paymentFilter !== 'all';

  return (
    <div className="space-y-5 animate-fade-in-up">



      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
        style={{
          background: 'linear-gradient(135deg, #003d2e 0%, #004d3a 40%, #1a1060 100%)',
          border: '1px solid rgba(0, 212, 170, 0.20)',
          boxShadow: '0 0 40px rgba(0,212,170,0.10), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-12 -right-12 size-48 rounded-full opacity-20 animate-spin-slow"
          style={{ background: 'radial-gradient(circle, #00d4aa 0%, transparent 70%)' }} />
        <div className="absolute -bottom-8 -left-8 size-32 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div>
            <div className="flex items-center gap-2 text-white/60 text-xs font-medium mb-2">
              <Calendar className="size-3.5" />
              {now.toLocaleDateString(i18n.language === 'en' ? 'en-IN' : i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {greeting}, <span style={{ color: '#00d4aa' }}>{user?.username || t('dashboard.welcome')}</span>! 👋
            </h1>
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.25)', color: '#00d4aa' }}>
                <TrendingUp className="size-3" />
                ₹{totalThisMonth.toLocaleString('en-IN')} {t('dashboard.this_month')}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}>
                <Zap className="size-3" />
                {monthlyTransactions} {t('dashboard.transactions')}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-transform hover:scale-105"
                onClick={() => navigate('/reconciliation')}
                style={{ background: 'rgba(57,153,255,0.15)', border: '1px solid rgba(57,153,255,0.25)', color: '#3999ff' }}>
                <ShieldCheck className="size-3" />
                {trustScore}% {t('dashboard.trust_score')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.70)' }}>
              <Sparkles className="size-3.5" style={{ color: '#00d4aa' }} />
              {t('dashboard.ai_insights')}
            </div>
            <VoiceExpenseInput
              onTranscribed={(_text, data) => {
                setVoicePrefillData({ ...data, source: 'voice' });
                setIsAddExpenseOpen(true);
              }}
            />
            <AddExpenseDialog
              onExpenseAdded={loadExpenses}
              isOpen={isAddExpenseOpen}
              onOpenChange={setIsAddExpenseOpen}
              initialData={voicePrefillData}
            />
          </div>
        </div>
      </div>

      {/* ── Financial Ticker ───────────────────────────────────────────── */}
      <div className="animate-fade-in-up-delay-1">
        <FinancialTicker />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="animate-fade-in-up-delay-1 flex flex-wrap gap-2">
        {[
          { icon: FileSpreadsheet, label: t('dashboard.export_csv'),    action: exportToCSV },
          { icon: FileText,        label: t('dashboard.export_json'),   action: exportToJSON },
          { icon: Camera,          label: t('dashboard.scan_receipt'),  action: () => navigate('/scan-receipt') },
        ].map(({ icon: Icon, label, action }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            onClick={action}
            className="card-hover glass border-border/50 hover:border-primary/30 hover:text-primary transition-all duration-200"
          >
            <Icon className="size-3.5 mr-1.5" />
            {label}
          </Button>
        ))}
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────────── */}
      <div className="animate-fade-in-up-delay-1">
        <StatsCards expenses={filteredExpenses} />
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      <div className="animate-fade-in-up-delay-2 glass-card border border-border/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.filters')}</span>
          {hasActiveFilters && (
            <span className="ml-auto text-xs text-primary cursor-pointer hover:underline"
              onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setDateFilter('all'); setPaymentFilter('all'); }}>
              {t('dashboard.clear_all')}
            </span>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder={t('dashboard.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-transparent border-border/50 focus:border-primary/40 transition-colors"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-transparent border-border/50">
              <SelectValue placeholder={t('dashboard.all_categories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.all_categories')}</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="bg-transparent border-border/50">
              <SelectValue placeholder={t('dashboard.all_time')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.all_time')}</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="bg-transparent border-border/50">
              <SelectValue placeholder={t('dashboard.payment_method')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <p className="mt-2.5 text-xs text-muted-foreground">
            {t('dashboard.showing')} <span className="text-foreground font-medium">{filteredExpenses.length}</span> {t('dashboard.of')} {expenses.length} {t('dashboard.expenses')}
          </p>
        )}
      </div>

      {/* ── Bento Grid ─────────────────────────────────────────────────── */}
      <div
        className="animate-fade-in-up-delay-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateRows: 'auto',
          gap: '1.25rem',
        }}
      >
        {/* Forecasting Row */}
        <div style={{ gridColumn: 'span 12' }} className="lg:[grid-column:span_6]">
           <ForecastCard expenses={expenses} />
        </div>
        <div style={{ gridColumn: 'span 12' }} className="lg:[grid-column:span_6]">
           <SavingsAdvisor expenses={expenses} />
        </div>

        {unconfirmedCount > 0 && (
           <div 
             style={{ gridColumn: 'span 12' }} 
             className="glass-card border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between cursor-pointer hover:bg-amber-500/10 transition-colors"
             onClick={() => navigate('/subscriptions')}
           >
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-full bg-amber-500/20 text-amber-600">
                    <Repeat className="size-6" />
                 </div>
                 <div>
                    <p className="font-bold text-amber-900 dark:text-amber-100">{t('dashboard.recurring_detected')}</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">{t('dashboard.recurring_desc', { count: unconfirmedCount })}</p>
                 </div>
              </div>
              <Button variant="ghost" className="text-amber-600 hover:text-amber-700 hover:bg-transparent">
                 {t('dashboard.review')} <ArrowRight className="size-4 ml-2" />
              </Button>
           </div>
        )}

        {/* Spending Chart — wide */}
        <div
          style={{ gridColumn: 'span 12' }}
          className="lg:[grid-column:span_8] glass-card border border-border/40 overflow-hidden card-hover"
        >
          <SpendingChart expenses={filteredExpenses} />
        </div>

        {/* AI Insights — tall right column */}
        <div
          style={{ gridColumn: 'span 12' }}
          className="lg:[grid-column:span_4] glass-card border border-border/40 overflow-hidden card-hover"
        >
          <AIInsights />
        </div>

        {/* Expense list — full width */}
        <div
          style={{ gridColumn: 'span 12' }}
          className="glass-card border border-border/40 overflow-hidden"
        >
          <ExpenseList expenses={filteredExpenses} onExpenseDeleted={loadExpenses} />
        </div>
      </div>
    </div>
  );
}
