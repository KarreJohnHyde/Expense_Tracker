import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useCurrency } from '../lib/currency';
import { TrendingUp, Sparkles, Calendar, Zap } from 'lucide-react';

interface Expense {
  amount: number;
  date: string;
}

interface ForecastCardProps {
  expenses: Expense[];
}

export function ForecastCard({ expenses }: ForecastCardProps) {
  const { formatCurrency } = useCurrency();
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthName = now.toLocaleString('default', { month: 'long' });

  const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const dailyAverage = totalSpent / (dayOfMonth || 1);
  const projectedTotal = dailyAverage * daysInMonth;
  
  const progressPercent = (dayOfMonth / daysInMonth) * 100;
  // Let's assume a default "soft budget" of 2x the current total for the sake of the bar, 
  // or use the projected total if no formal budget exists.
  const budgetUsedPercent = Math.min(100, (totalSpent / projectedTotal) * 100);

  return (
    <Card className="h-full border border-gray-200 dark:border-primary/20 bg-white dark:bg-card shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
         <Sparkles className="size-20 text-primary" />
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="size-5 text-primary" />
          Month-End Forecast
        </CardTitle>
        <CardDescription>Predicted spending for {monthName}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-1">
           <span className="text-3xl font-bold tracking-tight">
              {formatCurrency(projectedTotal)}
           </span>
           <span className="text-xs text-slate-600 dark:text-muted-foreground flex items-center gap-1">
              <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-500" />
              Projected based on ₹{dailyAverage.toFixed(0)} daily average
           </span>
        </div>

        <div className="space-y-4">
           <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                 <span className="text-slate-600 dark:text-muted-foreground">Month Progress</span>
                 <span className="font-medium text-emerald-700 dark:text-emerald-600">{dayOfMonth} / {daysInMonth} Days Passed</span>
              </div>
              <Progress value={progressPercent} className="h-1.5 bg-emerald-100 dark:bg-emerald-900/20" />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl border border-gray-200 dark:border-border bg-slate-50 dark:bg-card shadow-sm">
                 <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-muted-foreground mb-1">Safe to Spend Daily</p>
                 <p className="text-lg font-bold text-emerald-700 dark:text-emerald-600">
                    {formatCurrency(dailyAverage * 0.9)} 
                 </p>
              </div>
              <div className="p-3 rounded-xl border border-gray-200 dark:border-border bg-slate-50 dark:bg-card shadow-sm">
                 <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-muted-foreground mb-1">Expected Delta</p>
                 <p className="text-lg font-bold text-slate-900 dark:text-foreground">
                    +{formatCurrency(projectedTotal - totalSpent)}
                 </p>
              </div>
           </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-primary/10 border border-emerald-100 dark:border-primary/20 flex items-start gap-3">
           <Calendar className="size-4 text-emerald-600 dark:text-primary mt-0.5" />
           <p className="text-xs text-slate-600 dark:text-muted-foreground leading-relaxed">
             If you maintain this pace, you will end the month with a total outlay of <span className="text-slate-900 dark:text-foreground font-bold">{formatCurrency(projectedTotal)}</span>. 
             Reducing daily spend by 10% could save you <span className="text-emerald-700 dark:text-emerald-600 font-bold">{formatCurrency(projectedTotal * 0.1)}</span>.
           </p>
        </div>
      </CardContent>
    </Card>
  );
}
