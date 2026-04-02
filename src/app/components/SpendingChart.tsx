import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useCurrency } from '../lib/currency';
import { Badge } from './ui/badge';

interface Expense {
  id?: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod?: string;
}

interface SpendingChartProps {
  expenses: Expense[];
}

const COLORS: Record<string, string> = {
  'Food & Dining': '#f97316',
  'Transportation': '#3b82f6',
  'Shopping': '#ec4899',
  'Bills & Utilities': '#eab308',
  'Entertainment': '#a855f7',
  'Healthcare': '#ef4444',
  'Education': '#22c55e',
  'Trading': '#06b6d4',
  'Others': '#6b7280',
};

export function SpendingChart({ expenses }: SpendingChartProps) {
  const { formatCurrency } = useCurrency();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyExpenses = expenses.filter((e: Expense) => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Category breakdown
  const categoryData: Record<string, number> = {};
  monthlyExpenses.forEach((e: Expense) => {
    categoryData[e.category] = (categoryData[e.category] || 0) + e.amount;
  });

  const pieData = Object.entries(categoryData)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      id: `cat-${index}`,
      name,
      value,
    }));

  const totalSpend = pieData.reduce((s, d) => s + d.value, 0);

  // Weekly trend
  const weeklyData = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(currentYear, currentMonth, i * 7 + 1);
    const weekEnd = new Date(currentYear, currentMonth, (i + 1) * 7);
    const weekExpenses = monthlyExpenses.filter((e: Expense) => {
      const d = new Date(e.date);
      return d >= weekStart && d < weekEnd;
    });
    return {
      name: `Week ${i + 1}`,
      amount: weekExpenses.reduce((s: number, e: Expense) => s + e.amount, 0),
    };
  });

  // Daily trend (last 14 days)
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const dayExpenses = expenses.filter((e: Expense) => {
      return new Date(e.date).toDateString() === date.toDateString();
    });
    return {
      name: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      amount: dayExpenses.reduce((s: number, e: Expense) => s + e.amount, 0),
    };
  });

  // Payment method breakdown
  const paymentData: Record<string, number> = {};
  monthlyExpenses.forEach((e: Expense) => {
    const method = e.paymentMethod || 'Unknown';
    paymentData[method] = (paymentData[method] || 0) + e.amount;
  });
  const paymentPieData = Object.entries(paymentData)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ id: `pay-${i}`, name, value }));

  const payColors = ['#3b82f6', '#8b5cf6', '#f97316', '#22c55e', '#ef4444', '#06b6d4'];

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Spending Analytics</CardTitle>
            <CardDescription>Visual breakdown of your expenses</CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">
            {formatCurrency(totalSpend)} this month
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="payment">By Payment</TabsTrigger>
          </TabsList>

          {/* Daily Area Chart */}
          <TabsContent value="daily" className="space-y-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Area
                    type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2.5}
                    fill="url(#gradArea)" dot={{ r: 3, fill: '#3b82f6' }} isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Weekly Bar Chart */}
          <TabsContent value="weekly" className="space-y-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <defs>
                    <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="url(#gradBar)" radius={[10, 10, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Category Donut */}
          <TabsContent value="category" className="space-y-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={120}
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    dataKey="value" isAnimationActive={false}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.id} fill={COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Payment Method Breakdown */}
          <TabsContent value="payment" className="space-y-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPieData} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={120}
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    dataKey="value" isAnimationActive={false}
                  >
                    {paymentPieData.map((entry, i) => (
                      <Cell key={entry.id} fill={payColors[i % payColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}