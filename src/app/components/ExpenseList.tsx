import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  ShoppingBag, Utensils, Car, Zap, Film, Heart, BookOpen, 
  Trash2, Edit 
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useCurrency } from '../lib/currency';
import { AddExpenseDialog } from './AddExpenseDialog';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod?: string;
  tags?: string[];
}

interface ExpenseListProps {
  expenses: Expense[];
  onExpenseDeleted: () => void;
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ElementType> = {
    'Food & Dining': Utensils,
    'Transportation': Car,
    'Shopping': ShoppingBag,
    'Bills & Utilities': Zap,
    'Entertainment': Film,
    'Healthcare': Heart,
    'Education': BookOpen,
  };
  return icons[category] || ShoppingBag;
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Food & Dining': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'Transportation': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Shopping': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    'Bills & Utilities': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20',
    'Entertainment': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'Healthcare': 'bg-red-500/10 text-red-500 border-red-500/20',
    'Education': 'bg-green-500/10 text-green-500 border-green-500/20',
    'Others': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };
  return colors[category] || colors['Others'];
};

export function ExpenseList({ expenses, onExpenseDeleted }: ExpenseListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const { formatCurrency } = useCurrency();

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.deleteExpense(id);
      toast.success('Expense deleted gracefully');
      onExpenseDeleted();
    } catch (error) {
      toast.error('Failed to delete expense');
      console.error(error);
    } finally {
      setDeleting(null);
    }
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setEditOpen(true);
  };

  if (expenses.length === 0) {
    return (
      <Card className="col-span-1 shadow-sm border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-[480px] text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ShoppingBag className="size-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">No expenses found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            You haven't recorded any expenses in this period. Start by adding one above.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card className="col-span-1 shadow-md border-primary/10">
      <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-10 border-b pb-4">
        <div>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Your latest transactions</CardDescription>
        </div>
        <Badge variant="secondary" className="font-medium text-xs rounded-full px-3 shadow-inner">
          {expenses.length} Total
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[430px] rounded-b-xl border-t bg-muted/5">
          <div className="divide-y divide-border/50">
            {sortedExpenses.map((expense) => {
              const Icon = getCategoryIcon(expense.category);
              const isDeleting = deleting === expense.id;
              
              return (
                <div 
                  key={expense.id} 
                  className={`flex items-center justify-between p-4 hover:bg-card transition-all group ${
                    isDeleting ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl border ${getCategoryColor(expense.category)} shadow-sm transition-transform group-hover:scale-110 duration-300`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm leading-none">{expense.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <span className="font-medium bg-muted/50 px-1.5 py-0.5 rounded">{expense.category}</span>
                        <span>•</span>
                        <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold tracking-tight text-foreground">
                        {formatCurrency(expense.amount)}
                      </p>
                      {expense.paymentMethod && (
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {expense.paymentMethod}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={() => openEdit(expense)}
                        aria-label="Edit expense"
                      >
                        <Edit className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 p-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(expense.id)}
                        aria-label="Delete expense"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      {editingExpense && (
        <AddExpenseDialog
          mode="edit"
          expenseId={editingExpense.id}
          initialData={editingExpense}
          showTrigger={false}
          isOpen={editOpen}
          onOpenChange={(next) => {
            setEditOpen(next);
            if (!next) setEditingExpense(null);
          }}
          onExpenseAdded={onExpenseDeleted}
          onExpenseUpdated={onExpenseDeleted}
        />
      )}
    </Card>
  );
}
