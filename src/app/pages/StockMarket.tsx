import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
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
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdvancedStockChart } from '../components/AdvancedStockChart';
import { StockPrediction } from '../components/StockPrediction';
import { useCurrency } from '../lib/currency';
import { fetchQuotes, fetchTimeSeries, getMarketStatus } from '../lib/marketData';
import { api } from '../lib/api';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
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
  stockId: string;
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

const SECTORS = [
  'All',
  'Technology',
  'Finance',
  'Healthcare',
  'Energy',
  'Consumer Goods',
  'Telecommunications',
  'Automotive',
  'Metals',
  'Infrastructure',
  'FMCG',
  'Real Estate',
];

// Mock stock data — 32 major Indian stocks
const MOCK_STOCKS: Stock[] = [
  { id: '1', symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Technology', price: 3450.50, change: 45.30, changePercent: 1.33, volume: 2500000, marketCap: 1254000000000, high: 3475, low: 3420, open: 3430 },
  { id: '2', symbol: 'INFY', name: 'Infosys Limited', sector: 'Technology', price: 1580.75, change: -12.25, changePercent: -0.77, volume: 3200000, marketCap: 658000000000, high: 1595, low: 1575, open: 1590 },
  { id: '3', symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', price: 2456.80, change: 28.50, changePercent: 1.17, volume: 5400000, marketCap: 1661000000000, high: 2470, low: 2440, open: 2445 },
  { id: '4', symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Finance', price: 1650.25, change: -8.75, changePercent: -0.53, volume: 4100000, marketCap: 1214000000000, high: 1662, low: 1645, open: 1658 },
  { id: '5', symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Finance', price: 890.50, change: 15.60, changePercent: 1.78, volume: 3800000, marketCap: 624000000000, high: 895, low: 882, open: 885 },
  { id: '6', symbol: 'WIPRO', name: 'Wipro Limited', sector: 'Technology', price: 425.30, change: -3.20, changePercent: -0.75, volume: 2900000, marketCap: 232000000000, high: 430, low: 423, open: 428 },
  { id: '7', symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecommunications', price: 845.90, change: 22.40, changePercent: 2.72, volume: 3500000, marketCap: 491000000000, high: 850, low: 835, open: 838 },
  { id: '8', symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Healthcare', price: 1125.60, change: 8.30, changePercent: 0.74, volume: 1800000, marketCap: 270000000000, high: 1130, low: 1118, open: 1122 },
  { id: '9', symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Automotive', price: 10250.75, change: -85.25, changePercent: -0.83, volume: 950000, marketCap: 310000000000, high: 10290, low: 10240, open: 10275 },
  { id: '10', symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer Goods', price: 2890.40, change: 34.60, changePercent: 1.21, volume: 1200000, marketCap: 277000000000, high: 2900, low: 2875, open: 2880 },
  { id: '11', symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer Goods', price: 3150.25, change: -15.75, changePercent: -0.50, volume: 1600000, marketCap: 279000000000, high: 3168, low: 3145, open: 3162 },
  { id: '12', symbol: 'TATASTEEL', name: 'Tata Steel', sector: 'Metals', price: 125.80, change: 4.20, changePercent: 3.45, volume: 8200000, marketCap: 154000000000, high: 127, low: 123, open: 124 },
  { id: '13', symbol: 'SBIN', name: 'State Bank of India', sector: 'Finance', price: 625.40, change: 12.80, changePercent: 2.09, volume: 7800000, marketCap: 558000000000, high: 630, low: 618, open: 620 },
  { id: '14', symbol: 'HUL', name: 'Hindustan Unilever', sector: 'FMCG', price: 2510.30, change: -18.50, changePercent: -0.73, volume: 1400000, marketCap: 590000000000, high: 2535, low: 2505, open: 2525 },
  { id: '15', symbol: 'ITC', name: 'ITC Limited', sector: 'FMCG', price: 432.65, change: 6.75, changePercent: 1.59, volume: 6500000, marketCap: 540000000000, high: 435, low: 428, open: 429 },
  { id: '16', symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Finance', price: 1785.90, change: -22.10, changePercent: -1.22, volume: 2100000, marketCap: 354000000000, high: 1810, low: 1780, open: 1805 },
  { id: '17', symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Finance', price: 1045.25, change: 18.35, changePercent: 1.79, volume: 3400000, marketCap: 322000000000, high: 1050, low: 1032, open: 1035 },
  { id: '18', symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infrastructure', price: 3320.80, change: 42.60, changePercent: 1.30, volume: 1600000, marketCap: 456000000000, high: 3340, low: 3295, open: 3300 },
  { id: '19', symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Finance', price: 6890.50, change: -55.30, changePercent: -0.80, volume: 1100000, marketCap: 415000000000, high: 6950, low: 6870, open: 6940 },
  { id: '20', symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Automotive', price: 645.30, change: 15.80, changePercent: 2.51, volume: 5800000, marketCap: 238000000000, high: 650, low: 635, open: 638 },
  { id: '21', symbol: 'M&M', name: 'Mahindra & Mahindra', sector: 'Automotive', price: 1580.45, change: 28.90, changePercent: 1.86, volume: 2200000, marketCap: 196000000000, high: 1590, low: 1560, open: 1565 },
  { id: '22', symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Infrastructure', price: 2680.70, change: -35.40, changePercent: -1.30, volume: 3200000, marketCap: 305000000000, high: 2720, low: 2670, open: 2710 },
  { id: '23', symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'Technology', price: 1320.60, change: 16.40, changePercent: 1.26, volume: 2400000, marketCap: 358000000000, high: 1330, low: 1310, open: 1312 },
  { id: '24', symbol: 'TECHM', name: 'Tech Mahindra', sector: 'Technology', price: 1245.80, change: -8.60, changePercent: -0.69, volume: 1900000, marketCap: 121000000000, high: 1258, low: 1240, open: 1252 },
  { id: '25', symbol: 'NTPC', name: 'NTPC Limited', sector: 'Energy', price: 285.40, change: 5.60, changePercent: 2.00, volume: 4500000, marketCap: 277000000000, high: 288, low: 282, open: 283 },
  { id: '26', symbol: 'POWERGRID', name: 'Power Grid Corp', sector: 'Energy', price: 245.80, change: 3.20, changePercent: 1.32, volume: 3800000, marketCap: 171000000000, high: 248, low: 244, open: 244 },
  { id: '27', symbol: 'ULTRACEMCO', name: 'UltraTech Cement', sector: 'Infrastructure', price: 9850.25, change: 120.50, changePercent: 1.24, volume: 450000, marketCap: 285000000000, high: 9880, low: 9780, open: 9790 },
  { id: '28', symbol: 'JSWSTEEL', name: 'JSW Steel', sector: 'Metals', price: 785.30, change: 18.70, changePercent: 2.44, volume: 3600000, marketCap: 190000000000, high: 790, low: 775, open: 778 },
  { id: '29', symbol: 'NESTLEIND', name: 'Nestle India', sector: 'FMCG', price: 2450.60, change: -12.40, changePercent: -0.50, volume: 320000, marketCap: 236000000000, high: 2468, low: 2445, open: 2460 },
  { id: '30', symbol: 'BRITANNIA', name: 'Britannia Industries', sector: 'FMCG', price: 5120.45, change: 45.80, changePercent: 0.90, volume: 280000, marketCap: 123000000000, high: 5140, low: 5090, open: 5095 },
  { id: '31', symbol: 'DRREDDY', name: 'Dr. Reddy\'s Labs', sector: 'Healthcare', price: 5680.90, change: -28.70, changePercent: -0.50, volume: 520000, marketCap: 95000000000, high: 5710, low: 5670, open: 5705 },
  { id: '32', symbol: 'INDUSINDBK', name: 'IndusInd Bank', sector: 'Finance', price: 1420.75, change: 32.50, changePercent: 2.34, volume: 2100000, marketCap: 110000000000, high: 1430, low: 1398, open: 1400 },
];

const STOCK_SEED: Stock[] = MOCK_STOCKS.map((s) => ({
  ...s,
  apiSymbol: `${s.symbol}:NSE`,
}));

export default function StockMarket() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [stocks, setStocks] = useState<Stock[]>(STOCK_SEED);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>(STOCK_SEED);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
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
      const symbols = STOCK_SEED.map((s) => s.apiSymbol || s.symbol);
      const quotes = await fetchQuotes(symbols);
      const updated = STOCK_SEED.map((seed) => {
        const quote = quotes[seed.apiSymbol || ''] || quotes[seed.symbol];
        if (!quote) return seed;
        const price = quote.price || seed.price;
        const open = quote.open ?? seed.open;
        const previousClose = quote.previousClose ?? open;
        const change = quote.change ?? (price - previousClose);
        const changePercent = quote.changePercent ?? (previousClose ? (change / previousClose) * 100 : 0);
        return {
          ...seed,
          price: parseFloat(price.toFixed(2)),
          open,
          high: quote.high ?? seed.high,
          low: quote.low ?? seed.low,
          volume: quote.volume ?? seed.volume,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
        };
      });
      setStocks(updated);
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
    if (selectedStock) {
      const updated = stocks.find((s) => s.id === selectedStock.id);
      if (updated && updated !== selectedStock) {
        setSelectedStock(updated);
      }
    }
  }, [stocks, selectedStock]);

  // Filter stocks
  useEffect(() => {
    let filtered = stocks;

    if (selectedSector !== 'All') {
      filtered = filtered.filter((stock: Stock) => stock.sector === selectedSector);
    }

    if (searchQuery) {
      filtered = filtered.filter((stock: Stock) =>
        stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const timer = setTimeout(() => {
      setFilteredStocks(filtered);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [stocks, selectedSector, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const loadSeries = async () => {
      if (!selectedStock) return;
      try {
        const symbol = selectedStock.apiSymbol || selectedStock.symbol;
        const series = await fetchTimeSeries(symbol, '5min', 60);
        if (cancelled) return;
        if (series.length > 0) {
          setChartData(series.map((p) => ({
            time: new Date(p.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            price: parseFloat(p.close.toFixed(2)),
          })));
          return;
        }
      } catch {
        // fall back
      }

      const data: ChartPoint[] = [];
      let price = selectedStock.open;
      for (let i = 0; i < 20; i++) {
        price = price + (Math.random() - 0.5) * 20;
        data.push({
          time: `${9 + Math.floor(i / 4)}:${(i % 4) * 15}0`,
          price: parseFloat(price.toFixed(2)),
        });
      }
      if (!cancelled) setChartData(data);
    };
    loadSeries();
    return () => { cancelled = true; };
  }, [selectedStock]);

  const handleBuy = () => {
    if (!selectedStock) return;

    const existingPosition = portfolio.find((p: Portfolio) => p.stockId === selectedStock.id);
    
    if (existingPosition) {
      const totalQuantity = existingPosition.quantity + tradeQuantity;
      const avgPrice = (existingPosition.buyPrice * existingPosition.quantity + selectedStock.price * tradeQuantity) / totalQuantity;
      
      setPortfolio((prev: Portfolio[]) =>
        prev.map((p: Portfolio) =>
          p.stockId === selectedStock.id
            ? { ...p, quantity: totalQuantity, buyPrice: avgPrice, currentPrice: selectedStock.price }
            : p
        )
      );
    } else {
      setPortfolio((prev: Portfolio[]) => [
        ...prev,
        {
          stockId: selectedStock.id,
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          quantity: tradeQuantity,
          buyPrice: selectedStock.price,
          currentPrice: selectedStock.price,
        },
      ]);
    }
    
    // EDGE PIPELINE
    const value = selectedStock.price * tradeQuantity;
    api.addExpense({
      description: `Bought ${tradeQuantity} shares of ${selectedStock.symbol}`,
      amount: value,
      category: 'Investments & Savings',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Net Banking',
      source: 'stock_trade',
      metadata: {
        action: 'buy',
        symbol: selectedStock.symbol,
        quantity: tradeQuantity,
        unitPrice: selectedStock.price,
      },
    }).catch(console.error);

    toast.success(`Bought ${tradeQuantity} shares of ${selectedStock.symbol} at ${formatCurrency(selectedStock.price)}`);
    setTradeDialogOpen(false);
    setTradeQuantity(1);
  };

  const handleSell = () => {
    if (!selectedStock) return;

    const position = portfolio.find((p: Portfolio) => p.stockId === selectedStock.id);
    if (!position) {
      toast.error("You don't own any shares of this stock");
      return;
    }

    if (position.quantity < tradeQuantity) {
      toast.error(`You only own ${position.quantity} shares`);
      return;
    }

    if (position.quantity === tradeQuantity) {
      setPortfolio((prev: Portfolio[]) => prev.filter((p: Portfolio) => p.stockId !== selectedStock.id));
    } else {
      setPortfolio((prev: Portfolio[]) =>
        prev.map((p: Portfolio) =>
          p.stockId === selectedStock.id
            ? { ...p, quantity: p.quantity - tradeQuantity }
            : p
        )
      );
    }
    
    const value = selectedStock.price * tradeQuantity;
    const profit = (selectedStock.price - position.buyPrice) * tradeQuantity;

    // EDGE PIPELINE
    api.addExpense({
      description: `Sold ${tradeQuantity} shares of ${selectedStock.symbol}`,
      amount: -value,
      category: 'Investments & Savings',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Net Banking',
      source: 'stock_trade',
      metadata: {
        action: 'sell',
        symbol: selectedStock.symbol,
        quantity: tradeQuantity,
        unitPrice: selectedStock.price,
        pnl: profit,
      },
    }).catch(console.error);

    toast.success(`Sold ${tradeQuantity} shares of ${selectedStock.symbol} at ${formatCurrency(selectedStock.price)}. P&L: ${formatCurrency(profit)}`);
    setTradeDialogOpen(false);
    setTradeQuantity(1);
  };

  const openTradeDialog = (stock: Stock, type: 'buy' | 'sell') => {
    setSelectedStock(stock);
    setTradeType(type);
    setTradeDialogOpen(true);
  };

  const portfolioValue = portfolio.reduce((sum: number, p: Portfolio) => {
    const stock = stocks.find((s: Stock) => s.id === p.stockId);
    return sum + (stock ? stock.price * p.quantity : 0);
  }, 0);

  const portfolioInvestment = portfolio.reduce((sum: number, p: Portfolio) => sum + p.buyPrice * p.quantity, 0);
  const portfolioProfit = portfolioValue - portfolioInvestment;
  const portfolioProfitPercent = portfolioInvestment > 0 ? (portfolioProfit / portfolioInvestment) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('stock.title')}</h1>
        <p className="text-muted-foreground">
          {marketStatus.configured ? 'Live stock prices via Twelve Data' : 'Demo stock prices (configure live data)'}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={marketStatus.configured ? 'default' : 'secondary'} className={marketStatus.configured ? 'animate-pulse' : ''}>
            {marketStatus.configured ? t('stock.live') : t('stock.demo')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} | 
            {currentTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
          </span>
          {lastUpdated && (
            <Badge variant="outline" className="text-xs">
              {t('stock.updated')}: {lastUpdated}
            </Badge>
          )}
          {loading && (
            <Badge variant="outline" className="text-xs">
              Updating…
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
                <p className="text-sm text-muted-foreground">{t('stock.portfolio_value')}</p>
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
                <p className="text-sm text-muted-foreground">{t('stock.total_investment')}</p>
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
                <p className="text-sm text-muted-foreground">{t('stock.total_pnl')}</p>
                <p className={`text-2xl font-bold ${portfolioProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioProfit >= 0 ? '+' : ''}{formatCurrency(Math.abs(portfolioProfit))}
                </p>
              </div>
              {portfolioProfit >= 0 ? (
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
                <p className="text-sm text-muted-foreground">{t('stock.returns')}</p>
                <p className={`text-2xl font-bold ${portfolioProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioProfitPercent >= 0 ? '+' : ''}{portfolioProfitPercent.toFixed(2)}%
                </p>
              </div>
              <Activity className="size-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('stock.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('stock.select_sector')} />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stock List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('stock.live_market')}</CardTitle>
          <CardDescription>{t('stock.live_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredStocks.map((stock, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={stock.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedStock(stock);
                  openTradeDialog(stock, 'buy');
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold">{stock.symbol}</p>
                      <p className="text-sm text-muted-foreground">{stock.name}</p>
                    </div>
                    <Badge variant="secondary">{stock.sector}</Badge>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(stock.price)}</p>
                  <div className={`flex items-center gap-1 text-sm ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stock.change >= 0 ? (
                      <ArrowUpRight className="size-4" />
                    ) : (
                      <ArrowDownRight className="size-4" />
                    )}
                    <span>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)</span>
                  </div>
                </div>

                <div className="ml-2 flex flex-row flex-wrap gap-1 shrink-0">
                  <Button
                    size="sm"
                    className="text-xs px-2 h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTradeDialog(stock, 'buy');
                    }}
                  >
                    <Plus className="size-3 mr-1" />
                    {t('stock.buy')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs px-2 h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTradeDialog(stock, 'sell');
                    }}
                  >
                    <Minus className="size-3 mr-1" />
                    {t('stock.sell')}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Stock Charts */}
      {selectedStock && (
        <AdvancedStockChart stock={selectedStock} />
      )}

      {/* Stock Prediction */}
      {selectedStock && (
        <StockPrediction stock={selectedStock} />
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <Card>
          <CardHeader>
          <CardTitle>{t('stock.my_portfolio')}</CardTitle>
          <CardDescription>{t('stock.holdings')}</CardDescription>
        </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {portfolio.map(position => {
                const stock = stocks.find(s => s.id === position.stockId);
                if (!stock) return null;

                const currentValue = stock.price * position.quantity;
                const investedValue = position.buyPrice * position.quantity;
                const profit = currentValue - investedValue;
                const profitPercent = (profit / investedValue) * 100;

                return (
                  <div key={position.stockId} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{position.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {position.quantity} {t('stock.shares')} @ {t('stock.avg')} {formatCurrency(position.buyPrice)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(currentValue)}</p>
                        <p className={`text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)} ({profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTradeDialog(stock, 'sell')}
                      >
                        {t('stock.sell')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade Dialog */}
      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tradeType === 'buy' ? t('stock.buy') : t('stock.sell')} {selectedStock?.symbol}
            </DialogTitle>
            <DialogDescription>
              {selectedStock?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedStock && (
            <div className="space-y-4">
              {/* Stock Chart */}
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis className="text-xs" domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))'
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorStock)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Stock Details */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted">
                <div>
                  <p className="text-sm text-muted-foreground">{t('stock.current_price')}</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedStock.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('stock.day_change')}</p>
                  <p className={`text-lg font-bold ${selectedStock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedStock.change >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('stock.day_high')}</p>
                  <p className="font-semibold">{formatCurrency(selectedStock.high)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('stock.day_low')}</p>
                  <p className="font-semibold">{formatCurrency(selectedStock.low)}</p>
                </div>
              </div>

              {/* Trade Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('stock.quantity')}</label>
                  <Input
                    type="number"
                    min="1"
                    value={tradeQuantity}
                    onChange={(e) => setTradeQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t('stock.total_value')}</span>
                    <span className="font-bold">{formatCurrency(selectedStock.price * tradeQuantity)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant={tradeType === 'buy' ? 'default' : 'outline'}
                    onClick={handleBuy}
                  >
                    {t('stock.buy')}
                  </Button>
                  <Button
                    className="flex-1"
                    variant={tradeType === 'sell' ? 'default' : 'outline'}
                    onClick={handleSell}
                  >
                    {t('stock.sell')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
