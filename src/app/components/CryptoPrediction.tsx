import { useEffect, useState } from 'react';
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
import { Brain, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { fetchTimeSeries, getMarketStatus } from '../lib/marketData';
import { buildForecast } from '../lib/forecast';

interface CryptoPredictionProps {
  crypto: {
    symbol: string;
    name: string;
    price: number;
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

export function CryptoPrediction({ crypto }: CryptoPredictionProps) {
  const { formatCurrency } = useCurrency();
  const [predictionData, setPredictionData] = useState<PredictionData[]>([]);
  const [summary, setSummary] = useState({
    nextHourChange: 0,
    nextDayChange: 0,
    confidence: 0,
    trend: 'neutral' as 'bullish' | 'bearish' | 'neutral',
  });
  const [loading, setLoading] = useState(false);
  const marketStatus = getMarketStatus();
  const nowMarker = predictionData.filter(d => d.actual !== null).slice(-1)[0]?.time;

  useEffect(() => {
    generatePrediction();
  }, [crypto]);

  const generatePrediction = async () => {
    setLoading(true);
    try {
      const series = await fetchTimeSeries(crypto.apiSymbol || `${crypto.symbol}/USD`, '1h', 120);
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

      const lastActual = seriesPoints[seriesPoints.length - 1]?.value ?? crypto.price;
      const stepsForHour = Math.max(1, Math.round((60 * 60 * 1000) / meta.intervalMs));
      const stepsForDay = Math.max(stepsForHour, Math.round((24 * 60 * 60 * 1000) / meta.intervalMs));

      const hourPoint = data[seriesPoints.length + stepsForHour - 1];
      const dayPoint = data[seriesPoints.length + Math.min(stepsForDay, horizon) - 1];

      const nextHourChange = hourPoint ? ((hourPoint.predicted - lastActual) / lastActual) * 100 : 0;
      const nextDayChange = dayPoint ? ((dayPoint.predicted - lastActual) / lastActual) * 100 : 0;

      const volatility = meta.stdev / lastActual;
      const confidence = Math.max(50, Math.min(95, 88 - volatility * 200));

      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (nextDayChange > 1) trend = 'bullish';
      else if (nextDayChange < -1) trend = 'bearish';

      setSummary({ nextHourChange, nextDayChange, confidence, trend });
    } catch {
      const now = new Date();
      setPredictionData([{
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        actual: crypto.price,
        predicted: crypto.price,
        upperBound: crypto.price,
        lowerBound: crypto.price,
      }]);
      setSummary({ nextHourChange: 0, nextDayChange: 0, confidence: 50, trend: 'neutral' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="size-5 text-amber-500" />
              AI Crypto Forecast
              <Badge variant={marketStatus.configured ? 'default' : 'secondary'} className="text-[10px]">
                {marketStatus.configured ? 'LIVE' : 'DEMO'}
              </Badge>
            </CardTitle>
            <CardDescription>
              ML-powered price forecast for {crypto.symbol}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={generatePrediction} disabled={loading}>
            <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Next Hour</div>
              <div className={`text-2xl font-bold ${summary.nextHourChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.nextHourChange >= 0 ? '+' : ''}{summary.nextHourChange.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Next 24 Hours</div>
              <div className={`text-2xl font-bold ${summary.nextDayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.nextDayChange >= 0 ? '+' : ''}{summary.nextDayChange.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                Trend
                {summary.trend === 'bullish' ? <TrendingUp className="size-4 text-green-600" /> : summary.trend === 'bearish' ? <TrendingDown className="size-4 text-red-600" /> : <span className="text-yellow-600">━</span>}
              </div>
              <Badge
                variant={summary.trend === 'bullish' ? 'default' : summary.trend === 'bearish' ? 'destructive' : 'secondary'}
                className="text-sm"
              >
                {summary.trend.toUpperCase()}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">{summary.confidence.toFixed(0)}% confidence</div>
            </CardContent>
          </Card>
        </div>

        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={predictionData}>
              <defs>
                <linearGradient id="colorCryptoPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCryptoActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" className="text-xs" angle={-45} textAnchor="end" height={80} />
              <YAxis className="text-xs" domain={['auto', 'auto']} tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Legend />

              <ReferenceLine
                x={nowMarker}
                stroke="#666"
                strokeDasharray="3 3"
                label="Now"
              />

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
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                fill="url(#colorCryptoActual)"
                strokeWidth={2}
                dot={false}
                name="Actual Price"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#f59e0b"
                fill="url(#colorCryptoPredicted)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Predicted Price"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground">
          Experimental forecast based on recent price history. Not financial advice.
        </p>
      </CardContent>
    </Card>
  );
}
