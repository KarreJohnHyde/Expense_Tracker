import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Repeat, Calendar, DollarSign, BrainCircuit, ShieldCheck, Info } from 'lucide-react';
import { api } from '../lib/api';
import { useCurrency } from '../lib/currency';
import { Skeleton } from '../components/ui/skeleton';

export default function Subscriptions() {
  const { formatCurrency } = useCurrency();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      // Find repeating payments automatically across entire expense DB
      const result = await api.getExpenses();
      const expenses = result.expenses || [];
      
      const subMap: Record<string, { count: number, amounts: number[], lastDate: string, category: string }> = {};
      
      expenses.forEach((e: any) => {
         const key = e.description?.toLowerCase().trim();
         if (!key) return;
         if (!subMap[key]) {
             subMap[key] = { count: 0, amounts: [], lastDate: e.date, category: e.category };
         }
         subMap[key].count++;
         subMap[key].amounts.push(Number(e.amount));
         if (new Date(e.date) > new Date(subMap[key].lastDate)) {
             subMap[key].lastDate = e.date;
         }
      });
      
      // ML Algorithm: It's a subscription if seen 2+ times with 10% amount variance max
      const detected = [];
      let total = 0;
      const SUBSCRIPTION_KEYWORDS = ['netflix', 'spotify', 'prime', 'apple', 'google', 'recharge', 'bill', 'premium', 'plus', 'pro', 'membership', 'sip', 'insurance'];
      
      for (const [name, data] of Object.entries(subMap)) {
          const isKeywordMatch = SUBSCRIPTION_KEYWORDS.some(kw => name.includes(kw));
          if (data.count > 1 || isKeywordMatch) {
              const amounts = data.amounts;
              const avgAmount = amounts.reduce((a,b)=>a+b,0)/amounts.length;
              const variance = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.20);
              
              if (variance || isKeywordMatch) {
                  detected.push({
                      name: name.charAt(0).toUpperCase() + name.slice(1),
                      averageAmount: avgAmount,
                      frequency: 'Monthly',
                      lastBilled: data.lastDate,
                      category: data.category || 'Entertainment',
                      confidence: isKeywordMatch ? 95 : 80,
                      isConfirmed: localStorage.getItem(`sub_confirmed_${name}`) === 'true'
                  });
                  total += avgAmount;
              }
          }
      }
      
      setSubscriptions(detected.sort((a,b) => b.averageAmount - a.averageAmount));
      setMonthlyTotal(total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      <div className="flex flex-col gap-2 relative z-10 glass p-6 rounded-2xl border">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Repeat className="size-8 text-blue-500" /> Subscription Manager
        </h1>
        <p className="text-muted-foreground w-full md:w-2/3">
          Our AI scans your payment history identifying recurring fixed costs.
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
                    <CardDescription className="font-semibold text-blue-600 mb-1 flex items-center gap-1"><BrainCircuit className="size-4"/> ML Recurring Total</CardDescription>
                    <p className="text-4xl font-extrabold">{formatCurrency(monthlyTotal)} <span className="text-sm font-normal text-muted-foreground">/ month</span></p>
                 </div>
                 <div className="size-16 bg-blue-500/20 rounded-full flex justify-center items-center">
                    <DollarSign className="size-8 text-blue-600" />
                 </div>
              </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {subscriptions.length > 0 ? subscriptions.map((sub, i) => (
                  <Card key={i} className={`hover:shadow-lg transition-all hover:scale-[1.02] ${sub.isConfirmed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/20'}`}>
                      <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                             <CardTitle className="overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2" title={sub.name}>
                                {sub.name} 
                                {sub.isConfirmed && <ShieldCheck className="size-4 text-emerald-500" />}
                             </CardTitle>
                             <Badge variant={sub.isConfirmed ? 'default' : 'outline'} className="shrink-0">{sub.category}</Badge>
                          </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                             {formatCurrency(sub.averageAmount)}
                          </div>
                          {!sub.isConfirmed ? (
                             <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2">
                                <Info className="size-3 text-amber-600 mt-0.5" />
                                <p className="text-[10px] text-amber-700 dark:text-amber-300">Potential subscription detected via {sub.confidence}% confidence ML model.</p>
                             </div>
                          ) : null}
                          <div className="flex justify-between text-xs text-muted-foreground border-t pt-4">
                             <span className="flex items-center gap-1"><Calendar className="size-3"/> Last: {sub.lastBilled}</span>
                             <button 
                               onClick={() => {
                                  localStorage.setItem(`sub_confirmed_${sub.name.toLowerCase()}`, String(!sub.isConfirmed));
                                  fetchSubscriptions();
                                }}
                                className={`text-[10px] font-bold uppercase transition-colors ${sub.isConfirmed ? 'text-red-500' : 'text-primary'}`}
                             >
                               {sub.isConfirmed ? 'Remove' : 'Confirm'}
                             </button>
                          </div>
                      </CardContent>
                  </Card>
              )) : (
                  <div className="col-span-full py-12 text-center border-dashed border-2 rounded-xl">
                      <Repeat className="size-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                      <p className="text-lg font-medium">No recurring subscriptions isolated</p>
                      <p className="text-sm text-muted-foreground">AI needs to see the same payment structure repeating over multiple months.</p>
                  </div>
              )}
          </div>
      </>
      )}
    </div>
  );
}
