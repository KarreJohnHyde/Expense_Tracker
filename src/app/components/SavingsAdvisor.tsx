import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { useCurrency } from '../lib/currency';
import { Heart, Brain, Lightbulb, ArrowRight, Wallet } from 'lucide-react';

interface Expense {
  amount: number;
  category: string;
  date: string;
}

interface SavingsAdvisorProps {
  expenses: Expense[];
}

export function SavingsAdvisor({ expenses }: SavingsAdvisorProps) {
  const { formatCurrency } = useCurrency();
  const now = new Date();

  const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Simple 50/30/20 heuristic
  // Needs: Rent, Bills, Groceries, Transport
  // Wants: Dining, Entertainment, Shopping
  // Savings: Investments (we track spend here but it's "good" spend)
  
  const needs = monthlyExpenses.filter(e => ['Bills & Utilities', 'Transportation', 'Food & Dining'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const wants = monthlyExpenses.filter(e => ['Shopping', 'Entertainment', 'Others'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const goodSpend = monthlyExpenses.filter(e => ['Investments & Savings'].includes(e.category)).reduce((s, e) => s + e.amount, 0);

  const needsPercent = totalSpent > 0 ? (needs / totalSpent) * 100 : 0;
  const wantsPercent = totalSpent > 0 ? (wants / totalSpent) * 100 : 0;
  
  let healthScore = 100;
  if (needsPercent > 60) healthScore -= 20;
  if (wantsPercent > 40) healthScore -= 15;
  if (goodSpend === 0) healthScore -= 10;

  const getAdvice = () => {
    if (wantsPercent > 40) return { title: "Target the 'Wants'", message: "Your discretionary spending is high. Try implementing a 48-hour rule for non-essential purchases." };
    if (needsPercent > 60) return { title: "Fixed Cost Alert", message: "Your recurring bills are taking up a large slice. Can you negotiate any utility rates or switch subscriptions?" };
    if (goodSpend === 0) return { title: "Start Small", message: "You haven't recorded any savings or investments yet. Aim for ₹500 next week to build the habit." };
    return { title: "Mastering the Flow", message: "Your distribution looks healthy! You are maintaining a balanced financial lifestyle." };
  };

  const advice = getAdvice();

  return (
    <Card className="h-full border-blue-500/20 bg-blue-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="size-5 text-blue-500" />
          AI Savings Advisor
        </CardTitle>
        <CardDescription>Machine learning insights into your lifestyle</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{healthScore}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold leading-tight">Financial<br/>Health Score</div>
           </div>
           <Badge variant={healthScore > 80 ? 'default' : 'secondary'} className={healthScore > 80 ? 'bg-emerald-500' : ''}>
              {healthScore > 80 ? 'Excellent' : healthScore > 60 ? 'On Track' : 'Needs Review'}
           </Badge>
        </div>

        <div className="space-y-3">
           <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                 <span>Expenditure Split</span>
                 <span className="text-blue-500 italic">50/30/20 Optimal Blend</span>
              </div>
              <div className="flex w-full h-3 rounded-full overflow-hidden border">
                 <div className="bg-blue-500 h-full" style={{ width: `${needsPercent}%` }} title="Needs" />
                 <div className="bg-amber-400 h-full" style={{ width: `${wantsPercent}%` }} title="Wants" />
                 <div className="bg-emerald-500 h-full flex-1" title="Savings" />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                 <span>{needsPercent.toFixed(0)}% Needs</span>
                 <span>{wantsPercent.toFixed(0)}% Wants</span>
                 <span>Saving Mode</span>
              </div>
           </div>
        </div>

        <div className="p-4 rounded-xl bg-card border-2 border-dashed border-blue-200 dark:border-blue-900/40 relative">
           <div className="absolute -top-3 left-3 bg-card px-2">
              <Lightbulb className="size-4 text-amber-500" />
           </div>
           <p className="font-bold text-sm mb-1">{advice.title}</p>
           <p className="text-xs text-muted-foreground leading-relaxed">{advice.message}</p>
           <Button variant="link" className="p-0 h-auto text-xs mt-2 text-blue-500">
              Read strategy guide <ArrowRight className="size-3 ml-1" />
           </Button>
        </div>

        <div className="flex gap-4 items-center">
           <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Wallet className="size-4 text-blue-600" />
           </div>
           <div>
              <p className="text-xs font-medium">Estimated Annual Potential</p>
              <p className="text-sm font-bold text-emerald-600">Save up to {formatCurrency(totalSpent * 0.15)} / yr</p>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
