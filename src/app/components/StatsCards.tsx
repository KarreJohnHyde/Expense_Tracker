import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, TrendingDown, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { TiltCard } from './TiltCard';

interface Expense {
  id?: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod?: string;
}

interface StatsCardsProps {
  expenses: Expense[];
}

export function StatsCards({ expenses }: StatsCardsProps) {
  const { formatCurrency } = useCurrency();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyExpenses = expenses.filter((e: Expense) => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalMonthly = monthlyExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const averageExpense = totalMonthly / (monthlyExpenses.length || 1);

  // Last month comparison
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastMonthExpenses = expenses.filter((e: Expense) => {
    const d = new Date(e.date);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });
  const totalLastMonth = lastMonthExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const percentageChange = totalLastMonth > 0
    ? ((totalMonthly - totalLastMonth) / totalLastMonth) * 100
    : 0;

  // Today's total
  const todayExpenses = monthlyExpenses.filter((e: Expense) => {
    return new Date(e.date).toDateString() === now.toDateString();
  });
  const totalToday = todayExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);

  // Largest expense
  const largest = monthlyExpenses.reduce((max: Expense | null, e: Expense) => {
    return !max || e.amount > max.amount ? e : max;
  }, null);

  const stats = [
    {
      title: 'This Month',
      value: formatCurrency(totalMonthly),
      change: percentageChange,
      icon: DollarSign,
      description: `${monthlyExpenses.length} transactions`,
      gradient: 'from-indigo-500 to-violet-500',
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500',
    },
    {
      title: 'Today',
      value: formatCurrency(totalToday),
      icon: Calendar,
      description: `${todayExpenses.length} transactions`,
      gradient: 'from-cyan-500 to-blue-500',
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-500',
    },
    {
      title: 'Average',
      value: formatCurrency(averageExpense),
      icon: CreditCard,
      description: 'Per transaction',
      gradient: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Largest',
      value: largest ? formatCurrency(largest.amount) : '—',
      icon: TrendingUp,
      description: largest?.category || 'No expenses',
      gradient: 'from-rose-500 to-pink-500',
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <TiltCard key={index} tiltMax={10} hoverScale={1.03} className="rounded-xl">
          <Card
            className="card-hover border-border/50 overflow-hidden relative group h-full"
          >
            {/* Gradient top accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.iconBg} transition-transform group-hover:scale-110`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                {stat.change !== undefined && stat.change !== 0 && (
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${
                    stat.change > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {stat.change > 0 ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {Math.abs(stat.change).toFixed(1)}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TiltCard>
      ))}
    </div>
  );
}
