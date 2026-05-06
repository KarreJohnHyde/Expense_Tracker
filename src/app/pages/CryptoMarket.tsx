import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Briefcase,
  Plus,
  Minus,
  Bitcoin
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCurrency } from '../lib/currency';
import { fetchQuotes, fetchTimeSeries, getMarketStatus } from '../lib/marketData';
import { CryptoPrediction } from '../components/CryptoPrediction';
import { api } from '../lib/api';


interface Crypto {
  id: string;
  symbol: string;
  name: string;
  type: string;
  apiSymbol?: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high: number;
  low: number;
  open: number;
}

interface Portfolio {
  cryptoId: string;
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
}

interface ChartPoint {
  time: string;
  price: number;
}

const TYPES = ['All', 'Layer 1', 'Layer 2', 'DeFi', 'Meme', 'Exchange', 'Oracle', 'Stablecoin', 'Gaming', 'AI', 'Privacy'];

// 25 major cryptocurrencies (fallback seed data)
const MOCK_CRYPTO: Crypto[] = [
  { id: '1', symbol: 'BTC', name: 'Bitcoin', type: 'Layer 1', price: 65000.50, change: 1200.30, changePercent: 1.88, volume: 35000000000, marketCap: 1250000000000, high: 66000, low: 63800, open: 63800.20 },
  { id: '2', symbol: 'ETH', name: 'Ethereum', type: 'Layer 1', price: 3450.75, change: -45.25, changePercent: -1.29, volume: 15000000000, marketCap: 415000000000, high: 3550, low: 3420, open: 3496 },
  { id: '3', symbol: 'SOL', name: 'Solana', type: 'Layer 1', price: 145.80, change: 8.50, changePercent: 6.19, volume: 4500000000, marketCap: 65000000000, high: 148, low: 135, open: 137.30 },
  { id: '4', symbol: 'BNB', name: 'Binance Coin', type: 'Exchange', price: 580.25, change: 5.75, changePercent: 1.00, volume: 1200000000, marketCap: 89000000000, high: 585, low: 572, open: 574.50 },
  { id: '5', symbol: 'DOGE', name: 'Dogecoin', type: 'Meme', price: 0.15, change: 0.02, changePercent: 15.38, volume: 3100000000, marketCap: 21000000000, high: 0.16, low: 0.13, open: 0.13 },
  { id: '6', symbol: 'LINK', name: 'Chainlink', type: 'Oracle', price: 18.30, change: -0.50, changePercent: -2.66, volume: 500000000, marketCap: 10500000000, high: 19.10, low: 18.00, open: 18.80 },
  { id: '7', symbol: 'UNI', name: 'Uniswap', type: 'DeFi', price: 11.40, change: 1.20, changePercent: 11.76, volume: 450000000, marketCap: 6800000000, high: 11.50, low: 10.10, open: 10.20 },
  { id: '8', symbol: 'ADA', name: 'Cardano', type: 'Layer 1', price: 0.58, change: 0.01, changePercent: 1.75, volume: 350000000, marketCap: 20500000000, high: 0.59, low: 0.56, open: 0.57 },
  { id: '9', symbol: 'XRP', name: 'Ripple', type: 'Layer 1', price: 0.62, change: 0.03, changePercent: 5.08, volume: 2800000000, marketCap: 33500000000, high: 0.64, low: 0.59, open: 0.59 },
  { id: '10', symbol: 'DOT', name: 'Polkadot', type: 'Layer 1', price: 7.85, change: -0.15, changePercent: -1.88, volume: 380000000, marketCap: 10200000000, high: 8.05, low: 7.75, open: 7.98 },
  { id: '11', symbol: 'AVAX', name: 'Avalanche', type: 'Layer 1', price: 38.50, change: 2.30, changePercent: 6.35, volume: 850000000, marketCap: 14200000000, high: 39.20, low: 36.80, open: 37.10 },
  { id: '12', symbol: 'MATIC', name: 'Polygon', type: 'Layer 2', price: 0.92, change: 0.04, changePercent: 4.55, volume: 620000000, marketCap: 9100000000, high: 0.94, low: 0.88, open: 0.89 },
  { id: '13', symbol: 'SHIB', name: 'Shiba Inu', type: 'Meme', price: 0.000028, change: 0.000005, changePercent: 21.74, volume: 1500000000, marketCap: 16500000000, high: 0.00003, low: 0.000023, open: 0.000023 },
  { id: '14', symbol: 'NEAR', name: 'NEAR Protocol', type: 'Layer 1', price: 5.45, change: 0.35, changePercent: 6.86, volume: 420000000, marketCap: 5800000000, high: 5.60, low: 5.15, open: 5.20 },
  { id: '15', symbol: 'AAVE', name: 'Aave', type: 'DeFi', price: 92.30, change: -3.20, changePercent: -3.35, volume: 180000000, marketCap: 1360000000, high: 96.00, low: 91.50, open: 95.20 },
  { id: '16', symbol: 'ARB', name: 'Arbitrum', type: 'Layer 2', price: 1.18, change: 0.08, changePercent: 7.27, volume: 560000000, marketCap: 3800000000, high: 1.22, low: 1.10, open: 1.12 },
  { id: '17', symbol: 'OP', name: 'Optimism', type: 'Layer 2', price: 2.85, change: 0.15, changePercent: 5.56, volume: 340000000, marketCap: 3200000000, high: 2.92, low: 2.72, open: 2.75 },
  { id: '18', symbol: 'FET', name: 'Fetch.ai', type: 'AI', price: 2.35, change: 0.28, changePercent: 13.53, volume: 780000000, marketCap: 6100000000, high: 2.42, low: 2.10, open: 2.12 },
  { id: '19', symbol: 'RNDR', name: 'Render Token', type: 'AI', price: 8.75, change: 0.65, changePercent: 8.02, volume: 520000000, marketCap: 3400000000, high: 8.90, low: 8.20, open: 8.25 },
  { id: '20', symbol: 'GRT', name: 'The Graph', type: 'AI', price: 0.32, change: 0.02, changePercent: 6.67, volume: 280000000, marketCap: 3050000000, high: 0.33, low: 0.30, open: 0.31 },
  { id: '21', symbol: 'SAND', name: 'The Sandbox', type: 'Gaming', price: 0.48, change: -0.02, changePercent: -4.00, volume: 190000000, marketCap: 1100000000, high: 0.51, low: 0.47, open: 0.50 },
  { id: '22', symbol: 'MANA', name: 'Decentraland', type: 'Gaming', price: 0.55, change: 0.03, changePercent: 5.77, volume: 210000000, marketCap: 1050000000, high: 0.57, low: 0.52, open: 0.53 },
  { id: '23', symbol: 'ATOM', name: 'Cosmos', type: 'Layer 1', price: 9.80, change: -0.40, changePercent: -3.92, volume: 240000000, marketCap: 3800000000, high: 10.30, low: 9.70, open: 10.15 },
  { id: '24', symbol: 'USDT', name: 'Tether', type: 'Stablecoin', price: 1.00, change: 0.00, changePercent: 0.01, volume: 52000000000, marketCap: 95000000000, high: 1.00, low: 1.00, open: 1.00 },
  { id: '25', symbol: 'USDC', name: 'USD Coin', type: 'Stablecoin', price: 1.00, change: 0.00, changePercent: -0.01, volume: 5800000000, marketCap: 33000000000, high: 1.00, low: 1.00, open: 1.00 },
];

const CRYPTO_SEED: Crypto[] = MOCK_CRYPTO.map((c) => ({
  ...c,
  apiSymbol: `${c.symbol}/USD`,
}));

export default function CryptoMarket() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [cryptos, setCryptos] = useState<Crypto[]>(CRYPTO_SEED);
  const [filteredCryptos, setFilteredCryptos] = useState<Crypto[]>(CRYPTO_SEED);
  const [portfolio, setPortfolio] = useState<Portfolio[]>(() => {
    try {
      const saved = localStorage.getItem('crypto:portfolio');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save portfolio on change
  useEffect(() => {
    localStorage.setItem('crypto:portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCrypto, setSelectedCrypto] = useState<Crypto | null>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState(1);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const marketStatus = getMarketStatus();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadQuotes = useCallback(async () => {
    try {
      const symbols = CRYPTO_SEED.map((c) => c.apiSymbol || `${c.symbol}/USD`);
      const quotes = await fetchQuotes(symbols);
      const updated = CRYPTO_SEED.map((seed) => {
        const quote = quotes[seed.apiSymbol || ''] || quotes[seed.symbol] || quotes[`${seed.symbol}/USD`];
        if (!quote) return seed;
        const price = quote.price || seed.price;
        const open = quote.open ?? seed.open;
        const previousClose = quote.previousClose ?? open;
        const change = quote.change ?? (price - previousClose);
        const changePercent = quote.changePercent ?? (previousClose ? (change / previousClose) * 100 : 0);
        return {
          ...seed,
          price: parseFloat(price.toFixed(4)),
          open,
          high: quote.high ?? seed.high,
          low: quote.low ?? seed.low,
          volume: quote.volume ?? seed.volume,
          change: parseFloat(change.toFixed(4)),
          changePercent: parseFloat(changePercent.toFixed(2)),
        };
      });
      setCryptos(updated);
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
    } catch {
      // Keep seed data if live fetch fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
    const interval = setInterval(loadQuotes, 15000);
    return () => clearInterval(interval);
  }, [loadQuotes]);

  useEffect(() => {
    if (selectedCrypto) {
      const updated = cryptos.find((c) => c.id === selectedCrypto.id);
      if (updated && updated !== selectedCrypto) {
        setSelectedCrypto(updated);
      }
    }
  }, [cryptos, selectedCrypto]);

  // Filter 
  useEffect(() => {
    let filtered = cryptos;
    if (selectedType !== 'All') {
      filtered = filtered.filter((c: Crypto) => c.type === selectedType);
    }
    if (searchQuery) {
      filtered = filtered.filter((c: Crypto) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredCryptos(filtered);
  }, [cryptos, selectedType, searchQuery]);

  // Generate chart data
  useEffect(() => {
    let cancelled = false;
    const loadSeries = async () => {
      if (!selectedCrypto) return;
      try {
        const series = await fetchTimeSeries(selectedCrypto.apiSymbol || `${selectedCrypto.symbol}/USD`, '1h', 48);
        if (cancelled) return;
        if (series.length > 0) {
          setChartData(series.map((p) => ({
            time: new Date(p.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            price: parseFloat(p.close.toFixed(4)),
          })));
          return;
        }
      } catch {
        // fall back
      }

      const data: ChartPoint[] = [];
      let price = selectedCrypto.open;
      for (let i = 0; i < 24; i++) {
        price = price + (Math.random() - 0.5) * (selectedCrypto.price * 0.01);
        const now = new Date();
        now.setHours(now.getHours() - (24 - i));
        data.push({
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          price: parseFloat(price.toFixed(4)),
        });
      }
      if (!cancelled) setChartData(data);
    };

    loadSeries();
    return () => { cancelled = true; };
  }, [selectedCrypto]);

  const handleBuy = () => {
    if (!selectedCrypto) return;
    const existingPosition = portfolio.find((p: Portfolio) => p.cryptoId === selectedCrypto.id);
    
    if (existingPosition) {
      const totalQuantity = existingPosition.quantity + tradeQuantity;
      const avgPrice = (existingPosition.buyPrice * existingPosition.quantity + selectedCrypto.price * tradeQuantity) / totalQuantity;
      
      setPortfolio((prev: Portfolio[]) =>
        prev.map((p: Portfolio) =>
          p.cryptoId === selectedCrypto.id
            ? { ...p, quantity: totalQuantity, buyPrice: avgPrice, currentPrice: selectedCrypto.price }
            : p
        )
      );
    } else {
      setPortfolio((prev: Portfolio[]) => [
        ...prev,
        {
          cryptoId: selectedCrypto.id,
          symbol: selectedCrypto.symbol,
          name: selectedCrypto.name,
          quantity: tradeQuantity,
          buyPrice: selectedCrypto.price,
          currentPrice: selectedCrypto.price,
        },
      ]);
    }
    
    // EDGE PIPELINE
    const value = selectedCrypto.price * tradeQuantity;
    api.addExpense({
      description: `Bought ${tradeQuantity} ${selectedCrypto.symbol}`,
      amount: value,
      category: 'Investments & Savings',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'UPI',
      source: 'crypto_trade',
      metadata: {
        action: 'buy',
        symbol: selectedCrypto.symbol,
        quantity: tradeQuantity,
        unitPrice: selectedCrypto.price,
      },
    }).catch(console.error);

    toast.success(`Bought ${tradeQuantity} ${selectedCrypto.symbol} at ${formatCurrency(selectedCrypto.price)}`);
    setTradeDialogOpen(false);
    setTradeQuantity(1);
  };

  const handleSell = () => {
    if (!selectedCrypto) return;
    const position = portfolio.find((p: Portfolio) => p.cryptoId === selectedCrypto.id);
    if (!position) {
      toast.error("You don't own any of this cryptocurrency");
      return;
    }
    if (position.quantity < tradeQuantity) {
      toast.error(`You only own ${position.quantity} ${position.symbol}`);
      return;
    }
    if (position.quantity === tradeQuantity) {
      setPortfolio((prev: Portfolio[]) => prev.filter((p: Portfolio) => p.cryptoId !== selectedCrypto.id));
    } else {
      setPortfolio((prev: Portfolio[]) =>
        prev.map((p: Portfolio) =>
          p.cryptoId === selectedCrypto.id
            ? { ...p, quantity: p.quantity - tradeQuantity }
            : p
        )
      );
    }
    
    const value = selectedCrypto.price * tradeQuantity;
    const profit = (selectedCrypto.price - position.buyPrice) * tradeQuantity;
    
    // EDGE PIPELINE (Sell acts as negative expense / income)
    api.addExpense({
      description: `Sold ${tradeQuantity} ${selectedCrypto.symbol}`,
      amount: -value,
      category: 'Investments & Savings',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Net Banking',
      source: 'crypto_trade',
      metadata: {
        action: 'sell',
        symbol: selectedCrypto.symbol,
        quantity: tradeQuantity,
        unitPrice: selectedCrypto.price,
        pnl: profit,
      },
    }).catch(console.error);

    toast.success(`Sold ${tradeQuantity} ${selectedCrypto.symbol} at ${formatCurrency(selectedCrypto.price)}. P&L: ${formatCurrency(profit)}`);
    setTradeDialogOpen(false);
    setTradeQuantity(1);
  };

  const openTradeDialog = (crypto: Crypto, type: 'buy' | 'sell') => {
    setSelectedCrypto(crypto);
    setTradeType(type);
    setTradeDialogOpen(true);
  };

  const portfolioValue = portfolio.reduce((sum: number, p: Portfolio) => {
    const crypto = cryptos.find((c: Crypto) => c.id === p.cryptoId);
    return sum + (crypto ? crypto.price * p.quantity : 0);
  }, 0);

  const portfolioInvestment = portfolio.reduce((sum: number, p: Portfolio) => sum + p.buyPrice * p.quantity, 0);
  const portfolioProfit = portfolioValue - portfolioInvestment;
  const portfolioProfitPercent = portfolioInvestment > 0 ? (portfolioProfit / portfolioInvestment) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('crypto.title')}</h1>
        <p className="text-muted-foreground">
          {marketStatus.configured ? 'Live crypto prices via Twelve Data' : 'Demo crypto prices (configure live data)'}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={marketStatus.configured ? 'default' : 'secondary'} className={marketStatus.configured ? 'animate-pulse' : ''}>
            {marketStatus.configured ? t('crypto.live') : t('crypto.demo')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </span>
          {lastUpdated && (
            <Badge variant="outline" className="text-xs">
              {t('crypto.updated')}: {lastUpdated}
            </Badge>
          )}
          {loading && (
            <Badge variant="outline" className="text-xs">
              Updating…
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('crypto.portfolio_value')}</p>
                <p className="text-2xl font-bold">{formatCurrency(portfolioValue)}</p>
              </div>
              <Briefcase className="size-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('crypto.total_investment')}</p>
                <p className="text-2xl font-bold">{formatCurrency(portfolioInvestment)}</p>
              </div>
              <DollarSign className="size-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('crypto.total_pnl')}</p>
                <p className={`text-2xl font-bold ${portfolioProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioProfit >= 0 ? '+' : ''}{formatCurrency(Math.abs(portfolioProfit))}
                </p>
              </div>
              {portfolioProfit >= 0 ? <TrendingUp className="size-8 text-green-600" /> : <TrendingDown className="size-8 text-red-600" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('crypto.returns')}</p>
                <p className={`text-2xl font-bold ${portfolioProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioProfitPercent >= 0 ? '+' : ''}{portfolioProfitPercent.toFixed(2)}%
                </p>
              </div>
              <Activity className="size-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('crypto.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('crypto.select_type')} />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type: string) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('crypto.prices')}</CardTitle>
          <CardDescription>{t('crypto.live_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredCryptos.map((crypto: Crypto) => (
              <div
                key={crypto.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedCrypto(crypto);
                  openTradeDialog(crypto, 'buy');
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Bitcoin className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{crypto.symbol}</p>
                      <p className="text-sm text-muted-foreground">{crypto.name}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-lg font-bold">{formatCurrency(crypto.price)}</p>
                  <div className={`flex items-center justify-end gap-1 text-sm ${crypto.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {crypto.change >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                    <span>{crypto.changePercent >= 0 ? '+' : ''}{crypto.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
                <div className="ml-2 flex flex-row flex-wrap gap-1 shrink-0">
                  <Button size="sm" className="text-xs px-2 h-7" onClick={(e) => { e.stopPropagation(); openTradeDialog(crypto, 'buy'); }}>
                    <Plus className="size-3 mr-1" /> {t('crypto.buy')}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs px-2 h-7" onClick={(e) => { e.stopPropagation(); openTradeDialog(crypto, 'sell'); }}>
                    <Minus className="size-3 mr-1" /> {t('crypto.sell')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {portfolio.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('crypto.my_portfolio')}</CardTitle>
            <CardDescription>{t('crypto.holdings')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {portfolio.map((position: Portfolio) => {
                const crypto = cryptos.find((c: Crypto) => c.id === position.cryptoId);
                if (!crypto) return null;
                const currentValue = crypto.price * position.quantity;
                const investedValue = position.buyPrice * position.quantity;
                const profit = currentValue - investedValue;
                const profitPercent = (profit / investedValue) * 100;
                return (
                  <div key={position.cryptoId} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{position.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {position.quantity} {position.symbol} @ avg {formatCurrency(position.buyPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(currentValue)}</p>
                        <p className={`text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)} ({profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openTradeDialog(crypto, 'sell')}>
                        {t('crypto.sell')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCrypto && (
        <CryptoPrediction crypto={selectedCrypto} />
      )}

      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tradeType === 'buy' ? t('crypto.buy') : t('crypto.sell')} {selectedCrypto?.symbol}
            </DialogTitle>
            <DialogDescription>
              {selectedCrypto?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedCrypto && (
            <div className="space-y-4">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis className="text-xs" domain={['dataMin', 'dataMax']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area type="monotone" dataKey="price" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted">
                <div><p className="text-sm text-muted-foreground">{t('crypto.current_price')}</p><p className="text-lg font-bold">{formatCurrency(selectedCrypto.price)}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('crypto.change_24h')}</p><p className={`text-lg font-bold ${selectedCrypto.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{selectedCrypto.changePercent >= 0 ? '+' : ''}{selectedCrypto.changePercent.toFixed(2)}%</p></div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('crypto.quantity')} ({selectedCrypto.symbol})</label>
                  <Input type="number" step="0.01" min="0.01" value={tradeQuantity} onChange={(e) => setTradeQuantity(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t('crypto.total_value')}</span>
                    <span className="font-bold">{formatCurrency(selectedCrypto.price * tradeQuantity)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" variant={tradeType === 'buy' ? 'default' : 'outline'} onClick={handleBuy}>{t('crypto.buy')}</Button>
                  <Button className="flex-1" variant={tradeType === 'sell' ? 'default' : 'outline'} onClick={handleSell}>{t('crypto.sell')}</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
