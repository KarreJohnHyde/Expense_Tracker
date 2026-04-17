import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { api } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { DollarSign, Activity, CreditCard, Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useCurrency } from '../lib/currency';

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  percentage: number;
}

interface WeeklyTrend {
  week: string;
  amount: number;
}

interface AnalyticsData {
  totalMonthly: number;
  totalExpenses: number;
  averageExpense: number;
  categoryBreakdown?: CategoryBreakdown[];
  paymentMethodBreakdown?: PaymentMethodBreakdown[];
  weeklyTrend?: WeeklyTrend[];
  sourceBreakdown?: SourceBreakdown[];
}

interface SourceBreakdown {
  source: string;
  amount: number;
  count: number;
  percentage: number;
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual Entry',
  voice: 'Voice Input',
  receipt_scan: 'Receipt Scan',
  qr_scan: 'QR Code Scan',
  barcode_scan: 'Barcode Scan',
  stock_trade: 'Stock Trade',
  forex_trade: 'Forex Trade',
  crypto_trade: 'Crypto Trade',
  import: 'Import',
  automation: 'Automation',
};

export default function Analytics() {
  const { formatCurrency } = useCurrency();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    window.addEventListener('expenseai:edge:expenses_updated', loadAnalytics);
    return () => window.removeEventListener('expenseai:edge:expenses_updated', loadAnalytics);
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data as any);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Deep insights into your spending patterns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Monthly Spending
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.totalMonthly)}</div>
            <p className="text-xs text-muted-foreground">
              Across {analytics?.totalExpenses || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Transaction
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.averageExpense)}</div>
            <p className="text-xs text-muted-foreground">
              Per expense
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Most Used Payment
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.paymentMethodBreakdown?.[0]?.method || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analytics?.paymentMethodBreakdown?.[0]?.amount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Scanned Expenses
            </CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.sourceBreakdown?.filter(s => ['receipt_scan', 'qr_scan', 'barcode_scan'].includes(s.source)).reduce((sum, s) => sum + s.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analytics?.sourceBreakdown?.filter(s => ['receipt_scan', 'qr_scan', 'barcode_scan'].includes(s.source)).reduce((sum, s) => sum + s.amount, 0) || 0)} from scans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="sources">Scan Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>Breakdown of expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.categoryBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="category" 
                      className="text-xs"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category List */}
              <div className="mt-6 space-y-2">
                {analytics?.categoryBreakdown?.map((cat: CategoryBreakdown, index: number) => (
                  <div key={`cat-${cat.category}-${index}`} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{cat.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {cat.percentage?.toFixed(1)}% of total spending
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(cat.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Spending Trend</CardTitle>
              <CardDescription>Your spending pattern over the past weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.weeklyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Spending distribution by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.paymentMethodBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="method" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="amount" fill="#10b981" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Source</CardTitle>
              <CardDescription>How your expenses are captured — manual vs scanned vs automated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(analytics?.sourceBreakdown || []).map(s => ({ ...s, label: SOURCE_LABELS[s.source] || s.source }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      className="text-xs"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="amount" fill="#14b8a6" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Source List */}
              <div className="mt-6 space-y-2">
                {(analytics?.sourceBreakdown || []).map((src, index) => {
                  const isScanned = ['receipt_scan', 'qr_scan', 'barcode_scan'].includes(src.source);
                  return (
                    <div key={`src-${src.source}-${index}`} className={`flex items-center justify-between p-3 rounded-lg border ${isScanned ? 'border-teal-500/20 bg-teal-500/5' : ''}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{SOURCE_LABELS[src.source] || src.source}</p>
                          {isScanned && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-500 border border-teal-500/20">
                              📸 Scanned
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {src.count} transaction{src.count !== 1 ? 's' : ''} · {src.percentage?.toFixed(1)}% of total
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(src.amount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}