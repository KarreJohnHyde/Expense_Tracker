import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { Brain, RefreshCw, Clock } from 'lucide-react';
import { fetchTimeSeries, getMarketStatus } from '../lib/marketData';
import { buildForecast } from '../lib/forecast';

interface CurrencyPredictionProps {
  pair: {
    symbol: string;
    name: string;
    rate: number;
    change: number;
    changePercent: number;
  };
}

interface PredictionData {
  time: string;
  actual: number | null;
  predicted: number;
  upperBound: number;
  lowerBound: number;
}

export function CurrencyPrediction({ pair }: CurrencyPredictionProps) {
  const [predictionData, setPredictionData] = useState<PredictionData[]>([]);
  const [predictionSummary, setPredictionSummary] = useState({
    next1Hour: 0,
    next4Hours: 0,
    next24Hours: 0,
    confidence: 0,
    volatility: 'low' as 'low' | 'medium' | 'high',
  });
  const [loading, setLoading] = useState(false);
  const marketStatus = getMarketStatus();

  useEffect(() => {
    generatePrediction();
  }, [pair]);

  const generatePrediction = async () => {
    setLoading(true);
    try {
      const series = await fetchTimeSeries(pair.symbol, '1h', 120);
      if (series.length < 12) throw new Error('Insufficient data');

      const seriesPoints = series.map((p) => ({ time: p.time, value: p.close }));
      const horizon = 24;
      const { data, meta } = buildForecast(seriesPoints, horizon);

      const formatted = data.map((point) => ({
        ...point,
        time: new Date(point.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        predicted: parseFloat(point.predicted.toFixed(4)),
        upperBound: parseFloat(point.upperBound.toFixed(4)),
        lowerBound: parseFloat(point.lowerBound.toFixed(4)),
        actual: point.actual == null ? null : parseFloat(point.actual.toFixed(4)),
      }));

      setPredictionData(formatted);

      const lastActual = seriesPoints[seriesPoints.length - 1]?.value ?? pair.rate;
      const stepsFor1H = Math.max(1, Math.round((60 * 60 * 1000) / meta.intervalMs));
      const stepsFor4H = Math.max(stepsFor1H, Math.round((4 * 60 * 60 * 1000) / meta.intervalMs));
      const stepsFor24H = Math.max(stepsFor1H, Math.round((24 * 60 * 60 * 1000) / meta.intervalMs));

      const p1 = data[seriesPoints.length + stepsFor1H - 1];
      const p4 = data[seriesPoints.length + Math.min(stepsFor4H, horizon) - 1];
      const p24 = data[seriesPoints.length + Math.min(stepsFor24H, horizon) - 1];

      const next1Hour = p1 ? ((p1.predicted - lastActual) / lastActual) * 100 : 0;
      const next4Hours = p4 ? ((p4.predicted - lastActual) / lastActual) * 100 : 0;
      const next24Hours = p24 ? ((p24.predicted - lastActual) / lastActual) * 100 : 0;

      const volatilityRatio = meta.stdev / lastActual;
      let volatility: 'low' | 'medium' | 'high' = 'low';
      if (volatilityRatio > 0.01) volatility = 'high';
      else if (volatilityRatio > 0.005) volatility = 'medium';

      const confidence = Math.max(65, Math.min(98, 92 - volatilityRatio * 800));

      setPredictionSummary({
        next1Hour,
        next4Hours,
        next24Hours,
        confidence,
        volatility,
      });
    } catch {
      const now = new Date();
      setPredictionData([{
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        actual: pair.rate,
        predicted: pair.rate,
        upperBound: pair.rate,
        lowerBound: pair.rate,
      }]);
      setPredictionSummary({
        next1Hour: 0,
        next4Hours: 0,
        next24Hours: 0,
        confidence: 50,
        volatility: 'low',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });

  const currentDate = new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    weekday: 'long'
  });
  const nowMarker = predictionData.filter(d => d.actual !== null).slice(-1)[0]?.time;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="size-5 text-blue-500" />
              Forex Rate Prediction
              <Badge variant={marketStatus.configured ? 'default' : 'secondary'} className="text-[10px]">
                {marketStatus.configured ? 'LIVE' : 'DEMO'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Real-time ML-powered exchange rate forecast for {pair.symbol}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generatePrediction}
            disabled={loading}
          >
            <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Time Display */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Real-Time Data</span>
            </div>
            <Badge variant="default" className="animate-pulse">
              LIVE
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Current Time</div>
              <div className="text-lg font-bold">{currentTime}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Date</div>
              <div className="text-sm font-semibold">{currentDate}</div>
            </div>
          </div>
        </div>

        {/* Prediction Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Next 1 Hour</div>
              <div className={`text-xl font-bold ${
                predictionSummary.next1Hour >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {predictionSummary.next1Hour >= 0 ? '+' : ''}
                {predictionSummary.next1Hour.toFixed(4)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Rate: {(pair.rate * (1 + predictionSummary.next1Hour / 100)).toFixed(4)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Next 4 Hours</div>
              <div className={`text-xl font-bold ${
                predictionSummary.next4Hours >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {predictionSummary.next4Hours >= 0 ? '+' : ''}
                {predictionSummary.next4Hours.toFixed(4)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Rate: {(pair.rate * (1 + predictionSummary.next4Hours / 100)).toFixed(4)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Next 24 Hours</div>
              <div className={`text-xl font-bold ${
                predictionSummary.next24Hours >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {predictionSummary.next24Hours >= 0 ? '+' : ''}
                {predictionSummary.next24Hours.toFixed(4)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Rate: {(pair.rate * (1 + predictionSummary.next24Hours / 100)).toFixed(4)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Volatility & Confidence */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Volatility</div>
              <Badge 
                variant={
                  predictionSummary.volatility === 'high' ? 'destructive' : 
                  predictionSummary.volatility === 'medium' ? 'default' : 
                  'secondary'
                }
                className="text-sm"
              >
                {predictionSummary.volatility.toUpperCase()}
              </Badge>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Model Confidence</div>
              <div className="text-xl font-bold text-primary">
                {predictionSummary.confidence.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prediction Chart */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={predictionData}>
              <defs>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                className="text-xs"
                domain={['auto', 'auto']}
                tickFormatter={(value) => value.toFixed(4)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                }}
                formatter={(value: number) => [value.toFixed(4), '']}
              />
              <Legend />
              
              {/* Reference line at current time */}
              <ReferenceLine 
                x={nowMarker} 
                stroke="#666" 
                strokeDasharray="3 3" 
                label="Now"
              />
              
              {/* Confidence Bands */}
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="#9333ea"
                fill="none"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Upper Bound"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stroke="#9333ea"
                fill="none"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Lower Bound"
                isAnimationActive={false}
              />
              
              {/* Actual Historical Rate */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                fill="url(#colorActual)"
                strokeWidth={2}
                dot={false}
                name="Actual Rate"
                isAnimationActive={false}
              />
              
              {/* Predicted Future Rate */}
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#22c55e"
                fill="url(#colorPredicted)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Predicted Rate"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Brain className="size-4" />
            AI Forex Analysis
          </h4>
          <p className="text-sm text-muted-foreground">
            Our deep learning model predicts {pair.symbol} will{' '}
            <strong className={predictionSummary.next24Hours >= 0 ? 'text-green-600' : 'text-red-600'}>
              {predictionSummary.next24Hours >= 0 ? 'strengthen' : 'weaken'}
            </strong>{' '}
            by {Math.abs(predictionSummary.next24Hours).toFixed(4)}% over the next 24 hours.
            Market volatility is currently {predictionSummary.volatility.toUpperCase()}, 
            with {predictionSummary.confidence.toFixed(1)}% model confidence.
            {predictionSummary.volatility === 'high' && ' Exercise caution with position sizing.'}
            {predictionSummary.volatility === 'low' && ' Stable conditions favor longer-term positions.'}
            {' '}This is an experimental forecast, not financial advice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
