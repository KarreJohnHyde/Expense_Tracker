import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  RefreshCw,
  Wallet,
  History,
  Loader2,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { CurrencyPrediction } from '../components/CurrencyPrediction';
import {
  ForexPair,
  TradeRecord,
  fetchForexPairs,
  convertCurrency,
  autoRecordTrade,
  getTradeHistory,
} from '../lib/forexRates';
import { fetchTimeSeries, getMarketStatus } from '../lib/marketData';
import { notifyUser } from '../lib/notifications';

interface ForexPosition {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  entryRate: number;
  currentRate: number;
  amount: number;
  timestamp: string;
}

interface ChartPoint {
  time: string;
  rate: number;
}

const POSITIONS_KEY = 'forex:positions';

function loadPositions(): ForexPosition[] {
  try {
    return JSON.parse(localStorage.getItem(POSITIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePositions(positions: ForexPosition[]) {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
}

export default function CurrencyTrading() {
  const [pairs, setPairs] = useState<ForexPair[]>([]);
  const [positions, setPositions] = useState<ForexPosition[]>(loadPositions());
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>(getTradeHistory());
  const [selectedPair, setSelectedPair] = useState<ForexPair | null>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeAmount, setTradeAmount] = useState(1000);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const marketStatus = getMarketStatus();

  // Currency Converter
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('INR');
  const [amount, setAmount] = useState(100);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [converting, setConverting] = useState(false);

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD'];

  // Fetch live forex rates
  const loadRates = useCallback(async () => {
    try {
      const livePairs = await fetchForexPairs();
      if (livePairs.length > 0) {
        setPairs(livePairs);
        const updatedAt = livePairs[0]?.lastUpdated ? new Date(livePairs[0].lastUpdated) : new Date();
        setLastUpdated(updatedAt.toLocaleTimeString('en-IN'));
        // Update positions' current rates
        setPositions((prev: ForexPosition[]) => {
          const updated = prev.map((pos: ForexPosition) => {
            const livePair = livePairs.find((p: ForexPair) => p.symbol === pos.pair);
            return livePair ? { ...pos, currentRate: livePair.rate } : pos;
          });
          savePositions(updated);
          return updated;
        });
      }
    } catch {
      // silent fail, use cached data
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + 30s polling
  useEffect(() => {
    loadRates();
    const interval = setInterval(loadRates, 30000);
    return () => clearInterval(interval);
  }, [loadRates]);

  useEffect(() => {
    if (selectedPair) {
      const updated = pairs.find((p: ForexPair) => p.symbol === selectedPair.symbol);
      if (updated && updated !== selectedPair) {
        setSelectedPair(updated);
      }
    }
  }, [pairs, selectedPair]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load chart data when pair selected
  useEffect(() => {
    let cancelled = false;
    const loadSeries = async () => {
      if (!selectedPair) return;
      try {
        const series = await fetchTimeSeries(selectedPair.symbol, '5min', 60);
        if (cancelled) return;
        if (series.length > 0) {
          setChartData(series.map((point) => ({
            time: new Date(point.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            rate: parseFloat(point.close.toFixed(4)),
          })));
          return;
        }
      } catch {
        // fall back to synthetic data
      }

      const data: ChartPoint[] = [];
      let rate = selectedPair.rate;
      for (let i = 0; i < 30; i++) {
        rate = rate + (Math.random() - 0.5) * 0.02;
        const now = new Date();
        now.setMinutes(now.getMinutes() - (30 - i));
        data.push({
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          rate: parseFloat(rate.toFixed(4)),
        });
      }
      if (!cancelled) setChartData(data);
    };

    loadSeries();
    return () => { cancelled = true; };
  }, [selectedPair]);

  // Live currency conversion
  useEffect(() => {
    let cancelled = false;
    setConverting(true);
    convertCurrency(fromCurrency, toCurrency, amount).then((result: number) => {
      if (!cancelled) {
        setConvertedAmount(parseFloat(result.toFixed(2)));
        setConverting(false);
      }
    });
    return () => { cancelled = true; };
  }, [amount, fromCurrency, toCurrency, pairs]);

  // Handle trade with auto-recording
  const handleTrade = () => {
    if (!selectedPair) return;

    const position: ForexPosition = {
      id: crypto.randomUUID(),
      pair: selectedPair.symbol,
      type: tradeType,
      entryRate: selectedPair.rate,
      currentRate: selectedPair.rate,
      amount: tradeAmount,
      timestamp: new Date().toISOString(),
    };

    // Save position
    const newPositions = [position, ...positions];
    setPositions(newPositions);
    savePositions(newPositions);

    // Auto-record as expense
    autoRecordTrade({
      pair: selectedPair.symbol,
      type: tradeType,
      amount: tradeAmount,
      rate: selectedPair.rate,
      date: new Date().toISOString().split('T')[0],
    });

    // Update trade history
    setTradeHistory(getTradeHistory());

    // Fire notification
    const msg = `${tradeType === 'buy' ? 'Bought' : 'Sold'} $${tradeAmount.toLocaleString()} ${selectedPair.symbol} @ ${selectedPair.rate.toFixed(4)}`;
    notifyUser({
      type: 'large_transaction',
      title: `💱 Forex Trade: ${selectedPair.symbol}`,
      message: msg,
      desktopTitle: 'Forex Trade Executed',
      desktopBody: msg,
    });

    toast.success(msg);
    setTradeDialogOpen(false);
  };

  const handleClosePosition = (positionId: string) => {
    const position = positions.find((p: ForexPosition) => p.id === positionId);
    if (!position) return;

    const pair = pairs.find((p: ForexPair) => p.symbol === position.pair);
    if (!pair) return;

    const pnl = position.type === 'buy'
      ? (pair.rate - position.entryRate) * position.amount
      : (position.entryRate - pair.rate) * position.amount;

    // Auto-record the close as well
    autoRecordTrade({
      pair: position.pair,
      type: position.type === 'buy' ? 'sell' : 'buy',
      amount: position.amount,
      rate: pair.rate,
      date: new Date().toISOString().split('T')[0],
    });
    setTradeHistory(getTradeHistory());

    const newPositions = positions.filter((p: ForexPosition) => p.id !== positionId);
    setPositions(newPositions);
    savePositions(newPositions);

    const msg = `Position closed. P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
    notifyUser({
      type: pnl >= 0 ? 'info' : 'budget_alert',
      title: `📊 Position Closed: ${position.pair}`,
      message: msg,
      desktopTitle: 'Position Closed',
      desktopBody: msg,
    });
    toast.success(msg);
  };

  const totalPnL = positions.reduce((sum: number, position: ForexPosition) => {
    const pair = pairs.find((p: ForexPair) => p.symbol === position.pair);
    if (!pair) return sum;
    const pnl = position.type === 'buy'
      ? (pair.rate - position.entryRate) * position.amount
      : (position.entryRate - pair.rate) * position.amount;
    return sum + pnl;
  }, 0);

  if (loading && pairs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="size-10 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Fetching live forex rates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Currency Trading</h1>
        <p className="text-muted-foreground">
          {marketStatus.configured ? 'Live forex rates via Twelve Data' : 'Standard forex rates (configure live data)'} • Auto-recording enabled
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant={marketStatus.configured ? 'default' : 'secondary'} className={marketStatus.configured ? 'animate-pulse' : ''}>
            {marketStatus.configured ? 'LIVE' : 'STANDARD'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} |
            {currentTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
          </span>
          {lastUpdated && (
            <Badge variant="outline" className="text-xs">
              Updated: {lastUpdated}
            </Badge>
          )}
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Positions</p>
                <p className="text-2xl font-bold">{positions.length}</p>
              </div>
              <Wallet className="size-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </p>
              </div>
              {totalPnL >= 0 ? (
                <TrendingUp className="size-8 text-green-600" />
              ) : (
                <TrendingDown className="size-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trades Today</p>
                <p className="text-2xl font-bold">
                  {tradeHistory.filter((t: TradeRecord) => t.date === new Date().toISOString().split('T')[0]).length}
                </p>
              </div>
              <History className="size-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pairs Tracked</p>
                <p className="text-2xl font-bold">{pairs.length}</p>
              </div>
              <DollarSign className="size-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="live-rates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="live-rates">Live Rates</TabsTrigger>
          <TabsTrigger value="converter">Converter</TabsTrigger>
          <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>

        {/* Live Rates Tab */}
        <TabsContent value="live-rates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Forex Rates</CardTitle>
                  <CardDescription>Real exchange rates • Auto-refreshes every 30s</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={loadRates} disabled={loading}>
                  <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pairs.map((pair: ForexPair) => (
                  <div
                    key={pair.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedPair(pair);
                      setTradeDialogOpen(true);
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <ArrowRightLeft className="size-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{pair.symbol}</p>
                          <p className="text-sm text-muted-foreground">{pair.name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold">{pair.rate.toFixed(4)}</p>
                      <div className={`flex items-center gap-1 text-sm ${pair.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pair.change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        <span>{pair.change >= 0 ? '+' : ''}{pair.changePercent.toFixed(2)}%</span>
                      </div>
                    </div>

                    <div className="ml-4">
                      <Button size="sm">Trade</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          {selectedPair && chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedPair.symbol} Live Chart</CardTitle>
                <CardDescription>Rate: {selectedPair.rate.toFixed(4)} | High: {selectedPair.high24h.toFixed(4)} | Low: {selectedPair.low24h.toFixed(4)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis className="text-xs" domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="rate"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorRate)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Currency Prediction */}
          {selectedPair && (
            <CurrencyPrediction pair={selectedPair} />
          )}
        </TabsContent>

        {/* Currency Converter Tab */}
        <TabsContent value="converter">
          <Card>
            <CardHeader>
              <CardTitle>Currency Converter</CardTitle>
              <CardDescription>Convert between currencies using live exchange rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="flex-1"
                    />
                    <Select value={fromCurrency} onValueChange={setFromCurrency}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((curr: string) => (
                          <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">To</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={converting ? '...' : convertedAmount}
                      readOnly
                      className="flex-1 bg-muted"
                    />
                    <Select value={toCurrency} onValueChange={setToCurrency}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((curr: string) => (
                          <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-center text-lg">
                  <span className="font-bold">{amount} {fromCurrency}</span>
                  {' = '}
                  <span className="font-bold text-primary">
                    {converting ? '...' : convertedAmount.toLocaleString()} {toCurrency}
                  </span>
                </p>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  const temp = fromCurrency;
                  setFromCurrency(toCurrency);
                  setToCurrency(temp);
                }}
              >
                <ArrowRightLeft className="size-4 mr-2" />
                Swap Currencies
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>Your active forex trades • Auto-recorded as expenses</CardDescription>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="size-12 mx-auto mb-3 opacity-40" />
                  <p>No open positions</p>
                  <p className="text-sm mt-1">Start trading — all trades are automatically recorded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {positions.map((position: ForexPosition) => {
                    const pair = pairs.find((p: ForexPair) => p.symbol === position.pair);
                    if (!pair) return null;

                    const pnl = position.type === 'buy'
                      ? (pair.rate - position.entryRate) * position.amount
                      : (position.entryRate - pair.rate) * position.amount;

                    const pnlPercent = ((pnl / position.amount) * 100);

                    return (
                      <div key={position.id} className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={position.type === 'buy' ? 'default' : 'destructive'}>
                              {position.type.toUpperCase()}
                            </Badge>
                            <p className="font-semibold">{position.pair}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleClosePosition(position.id)}
                          >
                            Close Position
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Entry Rate</p>
                            <p className="font-semibold">{position.entryRate.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Current Rate</p>
                            <p className="font-semibold">{pair.rate.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-semibold">${position.amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">P&L</p>
                            <p className={`font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trade History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5" />
                Trade History
              </CardTitle>
              <CardDescription>All trades auto-recorded as expenses</CardDescription>
            </CardHeader>
            <CardContent>
              {tradeHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="size-12 mx-auto mb-3 opacity-40" />
                  <p>No trade history yet</p>
                  <p className="text-sm mt-1">All trades are automatically saved here and as expenses</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tradeHistory.map((trade: TradeRecord) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge variant={trade.type === 'buy' ? 'default' : 'destructive'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="font-semibold">{trade.pair}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${trade.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">@ {trade.rate.toFixed(4)}</p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        ✓ Recorded
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trade Dialog */}
      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trade {selectedPair?.symbol}</DialogTitle>
            <DialogDescription>{selectedPair?.name} • Auto-recorded as expense</DialogDescription>
          </DialogHeader>

          {selectedPair && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Live Rate</span>
                  <span className="font-bold">{selectedPair.rate.toFixed(4)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">24h Change</span>
                  <span className={`font-semibold ${selectedPair.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedPair.change >= 0 ? '+' : ''}{selectedPair.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">24h Range</span>
                  <span className="text-sm">{selectedPair.low24h.toFixed(4)} — {selectedPair.high24h.toFixed(4)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Trade Amount (USD)</label>
                <Input
                  type="number"
                  value={tradeAmount}
                  onChange={(e: any) => setTradeAmount(parseFloat(e.target.value) || 1000)}
                  min="100"
                  step="100"
                />
              </div>

              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
                ✅ This trade will be automatically recorded as an expense and a notification will be sent.
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setTradeType('buy');
                    handleTrade();
                  }}
                >
                  <TrendingUp className="size-4 mr-2" /> Buy
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    setTradeType('sell');
                    handleTrade();
                  }}
                >
                  <TrendingDown className="size-4 mr-2" /> Sell
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
