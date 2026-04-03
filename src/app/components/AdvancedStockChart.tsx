import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  LineChart as LineChartIcon,
  BarChart2
} from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { fetchTimeSeries } from '../lib/marketData';

interface AdvancedStockChartProps {
  stock: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    apiSymbol?: string;
    high?: number;
    low?: number;
    open?: number;
    volume?: number;
  };
}

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  upperBand: number;
  lowerBand: number;
  middleBand: number;
}

// Technical indicator calculations
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];
  const sum = data.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateEMA(data: number[], period: number): number {
  if (data.length === 0) return 0;
  if (data.length < period) return data[data.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateBollingerBands(data: number[], period: number = 20) {
  const sma = calculateSMA(data, period);
  const slice = data.slice(-period);
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: sma + (stdDev * 2),
    middle: sma,
    lower: sma - (stdDev * 2),
  };
}

export function AdvancedStockChart({ stock }: AdvancedStockChartProps) {
  const { formatCurrency } = useCurrency();
  const [timeframe, setTimeframe] = useState<'1min' | '5min' | '1hour' | '1day' | '1week'>('1day');
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [showIndicators, setShowIndicators] = useState({
    sma20: true,
    sma50: true,
    ema: false,
    bollinger: false,
    volume: true,
  });
  const [chartData, setChartData] = useState<CandleData[]>([]);

  useEffect(() => {
    void generateChartData();
  }, [stock, timeframe]);

  const generateChartData = async () => {
    const intervalMap: Record<typeof timeframe, string> = {
      '1min': '1min',
      '5min': '5min',
      '1hour': '1h',
      '1day': '1day',
      '1week': '1week',
    };
    const outputMap: Record<typeof timeframe, number> = {
      '1min': 60,
      '5min': 78,
      '1hour': 48,
      '1day': 60,
      '1week': 52,
    };

    try {
      const symbol = stock.apiSymbol || stock.symbol;
      const series = await fetchTimeSeries(symbol, intervalMap[timeframe], outputMap[timeframe]);
      if (series.length > 0) {
        const closePrices: number[] = [];
        const data: CandleData[] = series.map((point) => {
          closePrices.push(point.close);
          const sma20 = calculateSMA(closePrices, 20);
          const sma50 = calculateSMA(closePrices, 50);
          const ema12 = calculateEMA(closePrices, 12);
          const ema26 = calculateEMA(closePrices, 26);
          const bollinger = calculateBollingerBands(closePrices, 20);

          const date = new Date(point.time);
          const timeLabel = timeframe === '1day' || timeframe === '1week'
            ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

          return {
            time: timeLabel,
            open: parseFloat(point.open.toFixed(2)),
            high: parseFloat(point.high.toFixed(2)),
            low: parseFloat(point.low.toFixed(2)),
            close: parseFloat(point.close.toFixed(2)),
            volume: Math.max(0, Math.floor(point.volume || 0)),
            sma20: parseFloat(sma20.toFixed(2)),
            sma50: parseFloat(sma50.toFixed(2)),
            ema12: parseFloat(ema12.toFixed(2)),
            ema26: parseFloat(ema26.toFixed(2)),
            upperBand: parseFloat(bollinger.upper.toFixed(2)),
            middleBand: parseFloat(bollinger.middle.toFixed(2)),
            lowerBand: parseFloat(bollinger.lower.toFixed(2)),
          };
        });
        setChartData(data);
        return;
      }
    } catch {
      // fallback to synthetic data
    }

    const dataPoints = timeframe === '1min' ? 60 : timeframe === '5min' ? 78 : timeframe === '1hour' ? 24 : timeframe === '1day' ? 30 : 52;
    const data: CandleData[] = [];
    let basePrice = stock.price;
    const closePrices: number[] = [];

    for (let i = 0; i < dataPoints; i++) {
      const volatility = basePrice * 0.02;
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.floor(Math.random() * 1000000) + 500000;

      closePrices.push(close);

      const sma20 = calculateSMA(closePrices, 20);
      const sma50 = calculateSMA(closePrices, 50);
      const ema12 = calculateEMA(closePrices, 12);
      const ema26 = calculateEMA(closePrices, 26);
      const bollinger = calculateBollingerBands(closePrices, 20);

      let timeLabel = '';
      if (timeframe === '1min') {
        timeLabel = `${String(9 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`;
      } else if (timeframe === '5min') {
        timeLabel = `${String(9 + Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`;
      } else if (timeframe === '1hour') {
        timeLabel = `${String(9 + i).padStart(2, '0')}:00`;
      } else if (timeframe === '1day') {
        const date = new Date();
        date.setDate(date.getDate() - (dataPoints - i));
        timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        const date = new Date();
        date.setDate(date.getDate() - (dataPoints - i) * 7);
        timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      data.push({
        time: timeLabel,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
        sma20: parseFloat(sma20.toFixed(2)),
        sma50: parseFloat(sma50.toFixed(2)),
        ema12: parseFloat(ema12.toFixed(2)),
        ema26: parseFloat(ema26.toFixed(2)),
        upperBand: parseFloat(bollinger.upper.toFixed(2)),
        middleBand: parseFloat(bollinger.middle.toFixed(2)),
        lowerBand: parseFloat(bollinger.lower.toFixed(2)),
      });

      basePrice = close;
    }

    setChartData(data);
  };

  interface CandlestickProps {
    x: number;
    y: number;
    width: number;
    height: number;
    payload: CandleData;
  }

  const CustomCandlestick = (props: CandlestickProps) => {
    const { x, y, width, height, payload } = props;
    const isPositive = payload.close > payload.open;
    const bodyHeight = Math.abs(payload.close - payload.open) / (payload.high - payload.low) * height;


    return (
      <g>
        {/* Wick */}
        <line
          x1={x + width / 2}
          y1={y}
          x2={x + width / 2}
          y2={y + height}
          stroke={isPositive ? '#22c55e' : '#ef4444'}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={x + 1}
          y={isPositive ? y + (height - bodyHeight) : y}
          width={Math.max(width - 2, 1)}
          height={bodyHeight || 1}
          fill={isPositive ? '#22c55e' : '#ef4444'}
          stroke={isPositive ? '#22c55e' : '#ef4444'}
        />
      </g>
    );
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              {stock.symbol} - {stock.name}
              {stock.change >= 0 ? (
                <Badge variant="default" className="bg-green-500">
                  <TrendingUp className="size-3 mr-1" />
                  +{stock.changePercent.toFixed(2)}%
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <TrendingDown className="size-3 mr-1" />
                  {stock.changePercent.toFixed(2)}%
                </Badge>
              )}
            </CardTitle>
            <p className="text-3xl font-bold mt-2">{formatCurrency(stock.price)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {(['1min', '5min', '1hour', '1day', '1week'] as const).map((tf) => (
                <Button
                  key={tf}
                  variant={timeframe === tf ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </Button>
              ))}
            </div>

            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('candlestick')}
              >
                <BarChart2 className="size-4" />
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <LineChartIcon className="size-4" />
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('area')}
              >
                <BarChart3 className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={showIndicators.sma20 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowIndicators({ ...showIndicators, sma20: !showIndicators.sma20 })}
          >
            SMA 20
          </Button>
          <Button
            variant={showIndicators.sma50 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowIndicators({ ...showIndicators, sma50: !showIndicators.sma50 })}
          >
            SMA 50
          </Button>
          <Button
            variant={showIndicators.ema ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowIndicators({ ...showIndicators, ema: !showIndicators.ema })}
          >
            EMA
          </Button>
          <Button
            variant={showIndicators.bollinger ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowIndicators({ ...showIndicators, bollinger: !showIndicators.bollinger })}
          >
            Bollinger Bands
          </Button>
          <Button
            variant={showIndicators.volume ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowIndicators({ ...showIndicators, volume: !showIndicators.volume })}
          >
            Volume
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Main Price Chart */}
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  className="text-xs"
                  domain={['auto', 'auto']}
                  yAxisId="price"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <defs>
                  <linearGradient id="colorStockArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>

                {/* Bollinger Bands */}
                {showIndicators.bollinger && (
                  <>
                    <Area
                      yAxisId="price"
                      type="monotone"
                      dataKey="upperBand"
                      stroke="#9333ea"
                      fill="#9333ea"
                      fillOpacity={0.1}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      name="Upper Band"
                      isAnimationActive={false}
                    />
                    <Area
                      yAxisId="price"
                      type="monotone"
                      dataKey="lowerBand"
                      stroke="#9333ea"
                      fill="#9333ea"
                      fillOpacity={0.1}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      name="Lower Band"
                      isAnimationActive={false}
                    />
                  </>
                )}

                {/* Chart Type */}
                {chartType === 'candlestick' && (
                  <Bar
                    yAxisId="price"
                    dataKey="high"
                    shape={CustomCandlestick as any}
                    name="Price"
                    isAnimationActive={false}
                  />
                )}
                {chartType === 'line' && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Price"
                    isAnimationActive={false}
                  />
                )}
                {chartType === 'area' && (
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    stroke="#3b82f6"
                    fill="url(#colorStockArea)"
                    fillOpacity={1}
                    name="Price"
                    isAnimationActive={false}
                  />
                )}

                {/* Moving Averages */}
                {showIndicators.sma20 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="sma20"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="SMA 20"
                    isAnimationActive={false}
                  />
                )}
                {showIndicators.sma50 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="sma50"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="SMA 50"
                    isAnimationActive={false}
                  />
                )}
                {showIndicators.ema && (
                  <>
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="ema12"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="EMA 12"
                      strokeDasharray="3 3"
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="ema26"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      name="EMA 26"
                      strokeDasharray="3 3"
                      isAnimationActive={false}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Volume Chart */}
          {showIndicators.volume && (
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="time" 
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                    formatter={(value: number) => value.toLocaleString()}
                  />
                  <Bar
                    dataKey="volume"
                    fill="#6366f1"
                    opacity={0.6}
                    name="Volume"
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Technical Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Day High</p>
              <p className="text-lg font-bold">{formatCurrency(stock.high ?? stock.price)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Day Low</p>
              <p className="text-lg font-bold">{formatCurrency(stock.low ?? stock.price)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Volume</p>
              <p className="text-lg font-bold">{stock.volume ? stock.volume.toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open</p>
              <p className="text-lg font-bold">{formatCurrency(stock.open ?? stock.price)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
