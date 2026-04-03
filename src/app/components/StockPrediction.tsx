import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Brain, RefreshCw } from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { fetchTimeSeries, getMarketStatus } from '../lib/marketData';
import { buildForecast } from '../lib/forecast';

interface StockPredictionProps {
  stock: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    apiSymbol?: string;
  };
}

interface PredictionData {
  time: string;
  actual: number | null;
  predicted: number;
  upperBound: number;
  lowerBound: number;
}

export function StockPrediction({ stock }: StockPredictionProps) {
  const { formatCurrency } = useCurrency();
  const [predictionData, setPredictionData] = useState<PredictionData[]>([]);
  const [predictionSummary, setPredictionSummary] = useState({
    nextHourChange: 0,
    nextDayChange: 0,
    confidence: 0,
    trend: 'neutral' as 'bullish' | 'bearish' | 'neutral',
  });
  const [loading, setLoading] = useState(false);
  const marketStatus = getMarketStatus();

  useEffect(() => {
    generatePrediction();
  }, [stock]);

  const generatePrediction = async () => {
    setLoading(true);
    try {
      const series = await fetchTimeSeries(stock.apiSymbol || stock.symbol, '1h', 120);
      if (series.length < 12) throw new Error('Insufficient data');

      const seriesPoints = series.map((p) => ({ time: p.time, value: p.close }));
      const horizon = 24;
      const { data, meta } = buildForecast(seriesPoints, horizon);

      const formatted = data.map((point) => ({
        ...point,
        time: new Date(point.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        predicted: parseFloat(point.predicted.toFixed(2)),
        upperBound: parseFloat(point.upperBound.toFixed(2)),
        lowerBound: parseFloat(point.lowerBound.toFixed(2)),
        actual: point.actual == null ? null : parseFloat(point.actual.toFixed(2)),
      }));

      setPredictionData(formatted);

      const lastActual = seriesPoints[seriesPoints.length - 1]?.value ?? stock.price;
      const stepsForHour = Math.max(1, Math.round((60 * 60 * 1000) / meta.intervalMs));
      const stepsForDay = Math.max(stepsForHour, Math.round((24 * 60 * 60 * 1000) / meta.intervalMs));

      const nextHourPoint = data[seriesPoints.length + stepsForHour - 1];
      const nextDayPoint = data[seriesPoints.length + Math.min(stepsForDay, horizon) - 1];

      const nextHourChange = nextHourPoint ? ((nextHourPoint.predicted - lastActual) / lastActual) * 100 : 0;
      const nextDayChange = nextDayPoint ? ((nextDayPoint.predicted - lastActual) / lastActual) * 100 : 0;

      const volatility = meta.stdev / lastActual;
      const confidence = Math.max(55, Math.min(95, 90 - volatility * 200));

      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (nextDayChange > 0.5) trend = 'bullish';
      else if (nextDayChange < -0.5) trend = 'bearish';

      setPredictionSummary({
        nextHourChange,
        nextDayChange,
        confidence,
        trend,
      });
    } catch {
      // fallback to current price when live data is unavailable
      const now = new Date();
      setPredictionData([{
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        actual: stock.price,
        predicted: stock.price,
        upperBound: stock.price,
        lowerBound: stock.price,
      }]);
      setPredictionSummary({
        nextHourChange: 0,
        nextDayChange: 0,
        confidence: 50,
        trend: 'neutral',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  const nowMarker = predictionData.filter(d => d.actual !== null).slice(-1)[0]?.time;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="size-5 text-purple-500" />
              AI Price Prediction
              <Badge variant={marketStatus.configured ? 'default' : 'secondary'} className="text-[10px]">
                {marketStatus.configured ? 'LIVE' : 'DEMO'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Real-time ML-powered price forecast for {stock.symbol}
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
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Current Time:</span>
          <Badge variant="secondary" className="text-sm">
            {currentTime} | {new Date().toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })}
          </Badge>
        </div>

        {/* Prediction Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Next Hour</div>
              <div className={`text-2xl font-bold ${
                predictionSummary.nextHourChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {predictionSummary.nextHourChange >= 0 ? '+' : ''}
                {predictionSummary.nextHourChange.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Next 24 Hours</div>
              <div className={`text-2xl font-bold ${
                predictionSummary.nextDayChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {predictionSummary.nextDayChange >= 0 ? '+' : ''}
                {predictionSummary.nextDayChange.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">
                <div className="flex items-center gap-2">
                  Trend Signal
                  {predictionSummary.trend === 'bullish' ? (
                    <TrendingUp className="size-4 text-green-600" />
                  ) : predictionSummary.trend === 'bearish' ? (
                    <TrendingDown className="size-4 text-red-600" />
                  ) : (
                    <span className="text-yellow-600">━</span>
                  )}
                </div>
              </div>
              <div className="text-2xl font-bold">
                <Badge 
                  variant={
                    predictionSummary.trend === 'bullish' ? 'default' : 
                    predictionSummary.trend === 'bearish' ? 'destructive' : 
                    'secondary'
                  }
                  className="text-sm"
                >
                  {predictionSummary.trend.toUpperCase()}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {predictionSummary.confidence.toFixed(0)}% confidence
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prediction Chart */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={predictionData}>
              <defs>
                <linearGradient id="colorStockPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorStockActual" x1="0" y1="0" x2="0" y2="1">
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
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Legend />
              
              {/* Reference line at current time */}
              <ReferenceLine 
                x={nowMarker} 
                stroke="#666" 
                strokeDasharray="3 3" 
                label="Now"
              />
              
              {/* Prediction Confidence Bands */}
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="#9333ea"
                fill="none"
                strokeWidth={1}
                strokeDasharray="5 5"
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
                strokeDasharray="5 5"
                dot={false}
                name="Lower Bound"
                isAnimationActive={false}
              />
              
              {/* Actual Historical Price */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                fill="url(#colorStockActual)"
                strokeWidth={2}
                dot={false}
                name="Actual Price"
                isAnimationActive={false}
              />
              
              {/* Predicted Future Price */}
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#22c55e"
                fill="url(#colorStockPredicted)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Predicted Price"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Brain className="size-4" />
            AI Analysis
          </h4>
          <p className="text-sm text-muted-foreground">
            Based on technical indicators and recent price action, our neural network predicts a{' '}
            <strong className={predictionSummary.trend === 'bullish' ? 'text-green-600' : 'text-red-600'}>
              {predictionSummary.trend}
            </strong>{' '}
            trend for {stock.symbol}. The model shows{' '}
            <strong>{predictionSummary.confidence.toFixed(0)}% confidence</strong> in this forecast.
            {predictionSummary.nextDayChange > 2 && ' Strong upward momentum detected.'}
            {predictionSummary.nextDayChange < -2 && ' Significant downward pressure identified.'}
            {Math.abs(predictionSummary.nextDayChange) < 1 && ' Expect consolidation and range-bound movement.'}
            {' '}This is an experimental forecast, not financial advice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
