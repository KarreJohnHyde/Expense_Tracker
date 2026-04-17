import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Plus, Target, AlertTriangle, CheckCircle, Edit, Trash2, Camera } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useCurrency } from '../lib/currency';
import { Budget, Expense } from '../lib/api';
import { EXPENSE_CATEGORIES } from '../lib/expenseSchema';

const CATEGORIES = [...EXPENSE_CATEGORIES];

export default function Budgets() {
  const { currency, formatCurrency } = useCurrency();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [_loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetsData, expensesData] = await Promise.all([
        api.getBudgets(),
        api.getExpenses(),
      ]);
      setBudgets(budgetsData.budgets || []);
      setExpenses(expensesData.expenses || []);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await api.updateBudget(editingBudget.id, {
          category: formData.category,
          amount: parseFloat(formData.amount),
          period: formData.period,
        });
        toast.success('Budget updated successfully! 🎯');
      } else {
        await api.setBudget({
          category: formData.category,
          amount: parseFloat(formData.amount),
          period: formData.period,
        });
        toast.success('Budget set successfully! 🎯');
      }
      setOpen(false);
      setFormData({ category: '', amount: '', period: 'monthly' });
      setEditingBudget(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to set budget');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteBudget(id);
      toast.success('Budget deleted successfully! 🎯');
      setDeletingBudgetId(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete budget');
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearAllBudgets();
      toast.success('All budgets cleared successfully! 🎯');
      setClearingAll(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear all budgets');
    }
  };

  const calculateSpending = (category: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const categoryExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return (
        e.category === category &&
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear
      );
    });

    // Budgets track outgoing spend; negative values are inflow/refund/trade exits.
    return categoryExpenses.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);
  };

  const countScannedExpenses = (category: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return (
        e.category === category &&
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear &&
        e.source && ['receipt_scan', 'qr_scan', 'barcode_scan'].includes(e.source)
      );
    }).length;
  };

  const getBudgetStatus = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return { status: 'exceeded', color: 'text-red-600', icon: AlertTriangle };
    if (percentage >= 80) return { status: 'warning', color: 'text-orange-600', icon: AlertTriangle };
    return { status: 'good', color: 'text-green-600', icon: CheckCircle };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">
            Set and track your spending limits
          </p>
        </div>

        <div className="flex gap-2">
          {budgets.length > 0 && (
            <Button 
              variant="destructive" 
              size="lg" 
              className="gap-2"
              onClick={() => {
                if (confirm(`Are you sure you want to delete all ${budgets.length} budgets? This action cannot be undone.`)) {
                  handleClearAll();
                }
              }}
              disabled={clearingAll}
            >
              <Trash2 className="size-5" />
              {clearingAll ? 'Clearing...' : 'Clear All'}
            </Button>
          )}
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setEditingBudget(null);
              setFormData({ category: '', amount: '', period: 'monthly' });
            }
          }}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="size-5" />
                Set Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Category Budget</DialogTitle>
                <DialogDescription>
                  Set a spending limit for a specific category
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Budget Amount ({currency.symbol}) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
                    <SelectTrigger id="period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Set Budget
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {budgets.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="size-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No budgets set</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start setting budgets to track your spending goals
              </p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Set Your First Budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          budgets.map((budget) => {
            const spent = calculateSpending(budget.category);
            const scannedCount = countScannedExpenses(budget.category);
            const percentage = Math.min((spent / budget.amount) * 100, 100);
            const remaining = Math.max(budget.amount - spent, 0);
            const status = getBudgetStatus(spent, budget.amount);
            const StatusIcon = status.icon;

            return (
              <Card key={budget.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{budget.category}</CardTitle>
                    <Badge variant={status.status === 'good' ? 'default' : 'destructive'}>
                      {budget.period}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <StatusIcon className={`size-4 ${status.color}`} />
                    <span className={status.color}>
                      {percentage.toFixed(1)}% used
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={percentage} className="h-3" />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Spent</p>
                      <p className="text-xl font-bold">{formatCurrency(spent)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Budget</p>
                      <p className="text-xl font-bold">{formatCurrency(budget.amount)}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Remaining</span>
                      <span className={`text-lg font-bold ${status.color}`}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>

                  {scannedCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-teal-500 pt-1">
                      <Camera className="size-3.5" />
                      <span>{scannedCount} from scans</span>
                    </div>
                  )}

                  {percentage >= 80 && (
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        {percentage >= 100
                          ? '⚠️ Budget exceeded! Consider reviewing your spending.'
                          : '⚠️ You\'re nearing your budget limit!'}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setEditingBudget(budget);
                        setFormData({
                          category: budget.category,
                          amount: budget.amount.toString(),
                          period: budget.period,
                        });
                        setOpen(true);
                      }}
                    >
                      <Edit className="size-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete the ${budget.category} budget?`)) {
                          handleDelete(budget.id);
                        }
                      }}
                      disabled={deletingBudgetId === budget.id}
                    >
                      <Trash2 className="size-4 mr-2" />
                      {deletingBudgetId === budget.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
