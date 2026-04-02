import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, Brain, ArrowDown } from 'lucide-react';
import { api } from '../lib/api';
import { Skeleton } from './ui/skeleton';
import { useCurrency } from '../lib/currency';

interface Insight {
  type: string;
  title: string;
  message: string;
  category?: string;
  amount?: number;
  count?: number;
  potentialSavings?: number;
}

interface Prediction {
  currentMonthSpending: number;
  predictedMonthEnd: number;
  dailyAverage: number;
  recommendedDailyBudget: number;
}

export function AIInsights() {
  const { formatCurrency } = useCurrency();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [predictions, setPredictions] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const [insightsData, predictionsData] = await Promise.all([
        api.getInsights(),
        api.getPredictions(),
      ]);
      setInsights(insightsData.insights || []);
      setPredictions(predictionsData.predictions);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="size-5 text-red-500" />;
      case 'success':
        return <TrendingUp className="size-5 text-emerald-500" />;
      case 'tip':
        return <Lightbulb className="size-5 text-amber-500" />;
      case 'saving':
        return <ArrowDown className="size-5 text-blue-500" />;
      default:
        return <Sparkles className="size-5 text-primary" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-red-500/10 border-red-500/20';
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'tip': return 'bg-amber-500/10 border-amber-500/20';
      case 'saving': return 'bg-blue-500/10 border-blue-500/20';
      default: return 'bg-primary/10 border-primary/20';
    }
  };

  if (loading) {
    return (
      <Card className="col-span-1 border-primary/20 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="size-5 text-primary animate-pulse" />
            <div>
              <CardTitle>AI Financial Analyst</CardTitle>
              <CardDescription>Analyzing your spending patterns...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 border-primary/20 shadow-lg bg-gradient-to-b from-card to-primary/5">
      <CardHeader className="pb-3 border-b border-primary/10 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Brain className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">AI Financial Analyst</CardTitle>
            <CardDescription>Personalized insights & predictions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* ML Predictions Section */}
        {predictions && (
          <div className="grid gap-4 md:grid-cols-2 p-4 rounded-2xl bg-card border shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-orange-500" /> Projected Spend
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold tracking-tight text-orange-600 dark:text-orange-500">
                  {formatCurrency(predictions.predictedMonthEnd)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">End of current month</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-emerald-500" /> Recommended Daily
              </p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-500">
                {formatCurrency(predictions.recommendedDailyBudget)}
              </p>
              <p className="text-xs text-muted-foreground">To stay within budget</p>
            </div>
          </div>
        )}

        {/* AI Insights List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-2 flex items-center gap-2">
            <Lightbulb className="size-4" /> Actionable Insights
          </h4>
          
          {insights.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-xl text-muted-foreground">
              <Sparkles className="size-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">More data needed for AI insights</p>
            </div>
          ) : (
            insights.map((insight, index) => (
              <div
                key={index}
                className={`flex gap-3 p-4 rounded-xl border ${getInsightColor(insight.type)} transition-all hover:scale-[1.01]`}
              >
                <div className="mt-0.5 shrink-0">
                  {getInsightIcon(insight.type)}
                </div>
                <div className="space-y-1 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm leading-tight">{insight.title}</h4>
                    {insight.potentialSavings && (
                      <Badge variant="outline" className="bg-background/50 font-bold text-emerald-600 border-emerald-200">
                        Save {formatCurrency(insight.potentialSavings)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 leading-snug">
                    {insight.message}
                  </p>
                  
                  {insight.category && (
                    <div className="mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-background/50 border w-fit text-muted-foreground">
                      Target: {insight.category}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
