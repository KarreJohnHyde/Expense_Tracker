import { useState, useEffect } from 'react';
import { AddExpenseDialog } from '../components/AddExpenseDialog';
import { ExpenseList } from '../components/ExpenseList';
import { AIInsights } from '../components/AIInsights';
import { StatsCards } from '../components/StatsCards';
import { SpendingChart } from '../components/SpendingChart';
import { VoiceExpenseInput } from '../components/VoiceExpenseInput';
import { api } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search, FileText, FileSpreadsheet, Sparkles, Calendar, Camera } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { auth } from '../lib/auth';
import { useNavigate } from 'react-router';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod?: string;
}

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [voicePrefillData, setVoicePrefillData] = useState<any>(null);

  const navigate = useNavigate();
  const user = auth.getCurrentUser();
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchQuery, categoryFilter, dateFilter, paymentFilter]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await api.getExpenses();
      setExpenses(data.expenses || []);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load expenses';
      toast.error(msg);
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

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
      exp.paymentMethod
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

  const categories = ['Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Education', 'Others'];
  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const totalThisMonth = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ───────────────────────────────────────── */}
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-6 lg:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Calendar className="size-4" />
              {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              {greeting}, {user?.username || 'there'}! 👋
            </h1>
            <p className="text-white/80 mt-1 text-sm lg:text-base">
              You've spent ₹{totalThisMonth.toLocaleString()} this month across {expenses.filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length} transactions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-sm">
              <Sparkles className="size-4" />
              AI insights active
            </div>
            <VoiceExpenseInput 
              onTranscribed={(_text, data) => {
                setVoicePrefillData(data);
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

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <div className="animate-fade-in-up-delay-1 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportToCSV} className="card-hover">
          <FileSpreadsheet className="size-4 mr-2" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportToJSON} className="card-hover">
          <FileText className="size-4 mr-2" />
          Export JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/scan-receipt')} className="card-hover">
          <Camera className="size-4 mr-2" />
          Scan Receipt
        </Button>
      </div>

      {/* ── Advanced Filters ─────────────────────────────────────── */}
      <Card className="animate-fade-in-up-delay-1 glass border-border/50">
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {paymentMethods.map(method => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || categoryFilter !== 'all' || dateFilter !== 'all' || paymentFilter !== 'all') && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Showing {filteredExpenses.length} of {expenses.length} expenses
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setDateFilter('all');
                  setPaymentFilter('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="animate-fade-in-up-delay-2">
        <StatsCards expenses={filteredExpenses} />
      </div>

      {/* ── Charts ───────────────────────────────────────────────── */}
      <div className="animate-fade-in-up-delay-3">
        <SpendingChart expenses={filteredExpenses} />
      </div>

      {/* ── Main Content Grid ────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2 animate-fade-in-up-delay-3">
        <ExpenseList expenses={filteredExpenses} onExpenseDeleted={loadExpenses} />
        <AIInsights />
      </div>
    </div>
  );
}
