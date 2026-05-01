import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, ExternalLink, Landmark, Newspaper, ShoppingBag, Waves, RefreshCw, Globe, TrendingUp, Gem, BarChart3 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { fetchQuotes, getMarketStatus, type QuoteData } from '../lib/marketData';
import { api } from '../lib/api';
import { GlobalCurrencyExchange } from './GlobalCurrencyExchange';

type Segment = 'indices' | 'stocks' | 'ecommerce' | 'banking' | 'resources';

interface MarketTileConfig {
  id: string;
  label: string;
  symbol?: string;
  segment: Segment;
  fallbackPrice: number;
  fallbackChangePercent: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

interface MarketTileValue {
  price: number;
  changePercent: number;
  asOf: string;
  live: boolean;
}

interface NewsItem {
  title: string;
  link: string;
  publishedAt: string;
  source: string;
}

interface MacroMetric {
  label: string;
  value: string;
  note: string;
}

const env = (import.meta as { env?: Record<string, string> }).env || {};
const DIAMOND_PRICE_PER_CARAT_USD = Number(env.VITE_DIAMOND_PRICE_PER_CARAT_USD || 6200);

const MARKET_TILES: MarketTileConfig[] = [
  { id: 'nasdaq', label: 'NASDAQ', symbol: 'QQQ', segment: 'indices', fallbackPrice: 21456.29, fallbackChangePercent: 1.69, decimals: 2 },
  { id: 'dow', label: 'Dow Jones', symbol: 'DIA', segment: 'indices', fallbackPrice: 45687.68, fallbackChangePercent: 2.01, decimals: 2 },
  { id: 'sp500', label: 'S&P 500', symbol: 'SPY', segment: 'indices', fallbackPrice: 6464.52, fallbackChangePercent: 1.48, decimals: 2 },
  { id: 'ftse', label: 'FTSE 100', symbol: 'ISF.LON', segment: 'indices', fallbackPrice: 9321.4, fallbackChangePercent: 0.13, decimals: 2 },

  { id: 'aapl', label: 'AAPL', symbol: 'AAPL', segment: 'stocks', fallbackPrice: 227.32, fallbackChangePercent: 1.08, decimals: 2, prefix: '$' },
  { id: 'msft', label: 'MSFT', symbol: 'MSFT', segment: 'stocks', fallbackPrice: 413.19, fallbackChangePercent: 1.27, decimals: 2, prefix: '$' },
  { id: 'tsla', label: 'TSLA', symbol: 'TSLA', segment: 'stocks', fallbackPrice: 232.16, fallbackChangePercent: 3.43, decimals: 2, prefix: '$' },
  { id: 'nvda', label: 'NVDA', symbol: 'NVDA', segment: 'stocks', fallbackPrice: 914.27, fallbackChangePercent: 2.19, decimals: 2, prefix: '$' },

  { id: 'amzn', label: 'Amazon', symbol: 'AMZN', segment: 'ecommerce', fallbackPrice: 189.41, fallbackChangePercent: 0.94, decimals: 2, prefix: '$' },
  { id: 'baba', label: 'Alibaba', symbol: 'BABA', segment: 'ecommerce', fallbackPrice: 86.15, fallbackChangePercent: -0.68, decimals: 2, prefix: '$' },
  { id: 'meli', label: 'MercadoLibre', symbol: 'MELI', segment: 'ecommerce', fallbackPrice: 1765.2, fallbackChangePercent: 1.34, decimals: 2, prefix: '$' },
  { id: 'shop', label: 'Shopify', symbol: 'SHOP', segment: 'ecommerce', fallbackPrice: 71.28, fallbackChangePercent: 0.51, decimals: 2, prefix: '$' },

  { id: 'jpm', label: 'JPMorgan', symbol: 'JPM', segment: 'banking', fallbackPrice: 205.7, fallbackChangePercent: 0.77, decimals: 2, prefix: '$' },
  { id: 'bac', label: 'Bank of America', symbol: 'BAC', segment: 'banking', fallbackPrice: 37.11, fallbackChangePercent: 0.34, decimals: 2, prefix: '$' },
  { id: 'wfc', label: 'Wells Fargo', symbol: 'WFC', segment: 'banking', fallbackPrice: 59.42, fallbackChangePercent: 0.49, decimals: 2, prefix: '$' },
  { id: 'gs', label: 'Goldman Sachs', symbol: 'GS', segment: 'banking', fallbackPrice: 471.85, fallbackChangePercent: 1.11, decimals: 2, prefix: '$' },

  { id: 'gold', label: 'Gold (oz)', symbol: 'XAU/USD', segment: 'resources', fallbackPrice: 2329.4, fallbackChangePercent: 0.89, decimals: 2, prefix: '$' },
  { id: 'silver', label: 'Silver (oz)', symbol: 'XAG/USD', segment: 'resources', fallbackPrice: 27.42, fallbackChangePercent: 1.24, decimals: 2, prefix: '$' },
  { id: 'platinum', label: 'Platinum (oz)', symbol: 'XPT/USD', segment: 'resources', fallbackPrice: 1002.14, fallbackChangePercent: 0.58, decimals: 2, prefix: '$' },
  { id: 'brent', label: 'Brent Crude', symbol: 'BRENT', segment: 'resources', fallbackPrice: 87.12, fallbackChangePercent: -0.38, decimals: 2, prefix: '$' },
];

const FALLBACK_MACRO_METRICS: MacroMetric[] = [
  { label: 'World GDP Growth', value: '3.2%', note: 'IMF outlook' },
  { label: 'India GDP Growth', value: '7.8%', note: 'Recent FY estimate' },
  { label: 'US GDP Growth', value: '2.8%', note: 'Recent annualized quarter' },
  { label: 'India Per-Capita Income', value: '$2,730', note: 'Current US$ basis' },
  { label: 'US Per-Capita Income', value: '$86,600', note: 'Current US$ basis' },
  { label: 'Global E-Commerce Growth', value: '8.9%', note: 'Annual trend estimate' },
  { label: 'Global Banking Assets', value: '$183T', note: 'Latest industry snapshot' },
  { label: 'Top-100 Net Worth', value: '$4.5T', note: 'Estimated combined wealth' },
];

const FALLBACK_NEWS: NewsItem[] = [
  {
    title: 'Banks weigh rate-cut expectations as treasury yields shift',
    link: 'https://www.reuters.com/markets/',
    publishedAt: new Date().toISOString(),
    source: 'Markets Desk',
  },
  {
    title: 'E-commerce giants push logistics automation to protect margins',
    link: 'https://www.cnbc.com/economy/',
    publishedAt: new Date().toISOString(),
    source: 'Business Wire',
  },
  {
    title: 'Gold and silver traders track inflation and central-bank signals',
    link: 'https://www.marketwatch.com/markets',
    publishedAt: new Date().toISOString(),
    source: 'Commodities Brief',
  },
  {
    title: 'Global growth outlook remains resilient amid uneven regional demand',
    link: 'https://www.imf.org/en/Publications/WEO',
    publishedAt: new Date().toISOString(),
    source: 'Macro Monitor',
  },
];

function formatPrice(tile: MarketTileConfig, value: number): string {
  const decimals = tile.decimals ?? 2;
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${tile.prefix || ''}${formatted}${tile.suffix || ''}`;
}

function getFallbackTileValues(): Record<string, MarketTileValue> {
  const now = new Date().toISOString();
  const data: Record<string, MarketTileValue> = {};
  MARKET_TILES.forEach((tile) => {
    data[tile.id] = {
      price: tile.fallbackPrice,
      changePercent: tile.fallbackChangePercent,
      asOf: now,
      live: false,
    };
  });
  return data;
}

function getSourceName(url: string, feedTitle: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host) return host;
  } catch {
    // ignore and fallback
  }
  return feedTitle || 'finance';
}

function formatPublishedTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (!Number.isFinite(mins) || mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RealtimeFinanceHub() {
  const [tiles, setTiles] = useState<Record<string, MarketTileValue>>(() => getFallbackTileValues());
  const [news, setNews] = useState<NewsItem[]>(FALLBACK_NEWS);
  const [macroMetrics, setMacroMetrics] = useState<MacroMetric[]>(FALLBACK_MACRO_METRICS);
  const [netWorthMetric, setNetWorthMetric] = useState<MacroMetric | null>({
    label: 'Top-100 Net Worth',
    value: '$4.5T',
    note: 'Estimated combined wealth',
  });
  const [diamondPerCaratUsd, setDiamondPerCaratUsd] = useState<number>(DIAMOND_PRICE_PER_CARAT_USD);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [lastMarketRefresh, setLastMarketRefresh] = useState<string>('');
  const marketStatus = getMarketStatus();

  const loadMarket = useCallback(async () => {
    if (!marketStatus.configured) {
      setTiles(getFallbackTileValues());
      setLastMarketRefresh(new Date().toLocaleTimeString('en-IN'));
      setLoadingMarket(false);
      return;
    }

    const uniqueSymbols = [...new Set(MARKET_TILES.map((tile) => tile.symbol).filter((symbol): symbol is string => Boolean(symbol)))];
    const resolvedQuotes = new Map<string, QuoteData>();

    const settled = await Promise.allSettled(
      uniqueSymbols.map(async (symbol) => {
        const result = await fetchQuotes([symbol]);
        const exact = result[symbol];
        if (exact) return { symbol, quote: exact };
        const first = Object.values(result)[0];
        return { symbol, quote: first || null };
      }),
    );

    settled.forEach((entry) => {
      if (entry.status !== 'fulfilled') return;
      if (!entry.value.quote) return;
      resolvedQuotes.set(entry.value.symbol, entry.value.quote);
    });

    const now = new Date().toISOString();
    const nextTiles = getFallbackTileValues();
    MARKET_TILES.forEach((tile) => {
      if (!tile.symbol) return;
      const quote = resolvedQuotes.get(tile.symbol);
      if (!quote) return;
      const price = Number.isFinite(quote.price) ? quote.price : tile.fallbackPrice;
      const changePercent =
        typeof quote.changePercent === 'number' && Number.isFinite(quote.changePercent)
          ? quote.changePercent
          : tile.fallbackChangePercent;
      nextTiles[tile.id] = {
        price,
        changePercent,
        asOf: quote.datetime || now,
        live: true,
      };
    });

    setTiles(nextTiles);
    setLastMarketRefresh(new Date().toLocaleTimeString('en-IN'));
    setLoadingMarket(false);
  }, [marketStatus.configured]);

  const loadFinanceIntel = useCallback(async (forceRefresh = false) => {
    try {
      const payload = await api.getFinanceIntel(forceRefresh);
      if (Array.isArray(payload.news) && payload.news.length > 0) {
        const normalizedNews = payload.news
          .filter((item) => item.title && item.link)
          .map((item) => ({
            title: item.title,
            link: item.link,
            publishedAt: item.publishedAt || new Date().toISOString(),
            source: item.source || getSourceName(item.link, 'finance'),
          }));
        setNews(normalizedNews.length > 0 ? normalizedNews : FALLBACK_NEWS);
      } else {
        setNews(FALLBACK_NEWS);
      }

      if (Array.isArray(payload.macro) && payload.macro.length > 0) {
        setMacroMetrics(payload.macro.map((metric) => ({
          label: metric.label,
          value: metric.value,
          note: metric.note || (metric.source || 'backend proxy'),
        })));
      } else {
        setMacroMetrics(FALLBACK_MACRO_METRICS);
      }

      if (payload.netWorth?.combinedTop100Formatted) {
        setNetWorthMetric({
          label: 'Top-100 Net Worth',
          value: payload.netWorth.combinedTop100Formatted,
          note: payload.netWorth.source || 'Forbes snapshot',
        });
      } else {
        setNetWorthMetric({
          label: 'Top-100 Net Worth',
          value: '$4.5T',
          note: 'Estimated combined wealth',
        });
      }

      if (payload.resources?.diamond?.perCaratUsd) {
        setDiamondPerCaratUsd(Number(payload.resources.diamond.perCaratUsd));
      } else {
        setDiamondPerCaratUsd(DIAMOND_PRICE_PER_CARAT_USD);
      }
    } catch {
      setNews(FALLBACK_NEWS);
      setMacroMetrics(FALLBACK_MACRO_METRICS);
      setNetWorthMetric({
        label: 'Top-100 Net Worth',
        value: '$4.5T',
        note: 'Estimated combined wealth',
      });
      setDiamondPerCaratUsd(DIAMOND_PRICE_PER_CARAT_USD);
    } finally {
      setLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void loadMarket();
      void loadFinanceIntel();
    }, 0);

    const marketTimer = window.setInterval(loadMarket, 30000);
    const newsTimer = window.setInterval(() => {
      void loadFinanceIntel();
    }, 180000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(marketTimer);
      window.clearInterval(newsTimer);
    };
  }, [loadMarket, loadFinanceIntel]);

  const goldOuncePrice = tiles.gold?.price || MARKET_TILES.find((tile) => tile.id === 'gold')!.fallbackPrice;
  const goldPerGram24K = goldOuncePrice / 31.1034768;
  const goldRates = useMemo(() => {
    const rate24k = goldPerGram24K;
    return [
      { karat: '24K', value: rate24k },
      { karat: '22K', value: rate24k * (22 / 24) },
      { karat: '20K', value: rate24k * (20 / 24) },
      { karat: '18K', value: rate24k * (18 / 24) },
    ];
  }, [goldPerGram24K]);

  const segments: Array<{ id: Segment; label: string; icon: ReactNode }> = [
    { id: 'indices', label: 'Indices', icon: <Waves className="size-3.5" /> },
    { id: 'stocks', label: 'Stocks', icon: <ArrowUpRight className="size-3.5" /> },
    { id: 'ecommerce', label: 'E-Commerce', icon: <ShoppingBag className="size-3.5" /> },
    { id: 'banking', label: 'Banking', icon: <Landmark className="size-3.5" /> },
    { id: 'resources', label: 'Resources', icon: <Waves className="size-3.5" /> },
  ];

  return (
    <Card className="border-border/40 overflow-hidden relative" style={{
      background: 'linear-gradient(180deg, rgba(16,185,129,0.02) 0%, transparent 30%)',
    }}>
      {/* Decorative corner glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />

      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <BarChart3 className="size-4 text-white" />
              </div>
              Realtime Finance Dashboard
            </CardTitle>
            <p className="text-xs text-foreground/70 font-medium mt-1">
              Finance, stock market, e-commerce, banking, natural resources, metals, GDP and net-worth snapshots
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={marketStatus.configured ? 'default' : 'secondary'} className={marketStatus.configured ? 'animate-pulse' : ''}>
              {marketStatus.configured ? 'Live Feed' : 'Fallback Feed'}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void loadMarket();
                void loadFinanceIntel(true);
              }}
              disabled={loadingMarket}
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${loadingMarket ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Index Tiles */}
        <div className="flex flex-wrap gap-2">
          {(['nasdaq', 'dow', 'sp500', 'ftse'] as const).map((id) => {
            const tile = MARKET_TILES.find((item) => item.id === id)!;
            const value = tiles[id];
            const up = value.changePercent >= 0;
            return (
              <div key={id} className="rounded-xl border border-border/50 px-3 py-2.5 min-w-[170px] flex-1 transition-all duration-200 hover:shadow-md hover:border-border/80 cursor-default group bg-background/40 shadow-sm" style={{
                background: up
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.02) 100%)',
              }}>
                <div className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground/90 transition-colors">{tile.label}</div>
                <div className="text-sm font-bold mt-0.5">{formatPrice(tile, value.price)}</div>
                <div className={`text-xs mt-0.5 inline-flex items-center gap-1 ${up ? 'text-green-600' : 'text-red-600'}`}>
                  {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {up ? '+' : ''}{value.changePercent.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Tabs defaultValue="stocks">
              <TabsList className="w-full grid grid-cols-5">
                {segments.map((segment) => (
                  <TabsTrigger key={segment.id} value={segment.id} className="text-xs">
                    {segment.icon}
                    {segment.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {segments.map((segment) => (
                <TabsContent key={segment.id} value={segment.id} className="mt-3">
                  <div className="space-y-2">
                    {MARKET_TILES.filter((tile) => tile.segment === segment.id).map((tile) => {
                      const value = tiles[tile.id];
                      const up = value.changePercent >= 0;
                      return (
                        <div key={tile.id} className="rounded-xl border border-border/50 p-3 bg-card/70 hover:bg-card/90 hover:border-border/80 hover:shadow-sm transition-all duration-200 cursor-default group">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-1 h-8 rounded-full shrink-0 ${up ? 'bg-green-500' : 'bg-red-500'}`} style={{ opacity: 0.6 }} />
                              <div>
                                <p className="font-semibold text-sm group-hover:text-primary transition-colors">{tile.label}</p>
                                <p className="text-[11px] text-foreground/70 font-medium">{tile.symbol || 'Reference series'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{formatPrice(tile, value.price)}</p>
                              <p className={`text-xs inline-flex items-center gap-1 font-semibold ${up ? 'text-green-600' : 'text-red-600'}`}>
                                {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                                {up ? '+' : ''}{value.changePercent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="lg:col-span-4 space-y-3">
            {/* Gold Rates */}
            <div className="rounded-xl border border-amber-500/20 p-3 hover:border-amber-500/30 transition-colors bg-background/50 shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, transparent 100%)' }}>
              <p className="text-xs font-semibold text-amber-900/70 dark:text-amber-100/70 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-amber-500">✦</span> Gold Rates (USD / gram)
              </p>
              <div className="mt-2 space-y-1.5">
                {goldRates.map((rate) => (
                  <div key={rate.karat} className="flex items-center justify-between text-sm p-1.5 rounded-lg hover:bg-amber-500/5 transition-colors">
                    <span className="font-medium">{rate.karat}</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">${rate.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Diamond */}
            <div className="rounded-xl border border-blue-500/20 p-3 hover:border-blue-500/30 transition-colors bg-background/50 shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%)' }}>
              <p className="text-xs font-semibold text-blue-900/70 dark:text-blue-100/70 uppercase tracking-wide flex items-center gap-1.5">
                <Gem className="size-3 text-blue-500" /> Diamond (Per Carat)
              </p>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <p className="text-lg font-bold">${diamondPerCaratUsd.toLocaleString('en-US')}</p>
                  <p className="text-[11px] text-blue-900/60 dark:text-blue-100/60 font-medium">Reference market price</p>
                </div>
                <Badge variant="outline">Configurable</Badge>
              </div>
            </div>

            {/* Macro Snapshot */}
            <div className="rounded-xl border border-purple-500/20 p-3 hover:border-purple-500/30 transition-colors bg-background/50 shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, transparent 100%)' }}>
              <p className="text-xs font-semibold text-purple-900/70 dark:text-purple-100/70 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="size-3 text-purple-500" /> Macro Snapshot
              </p>
              <div className="mt-2 space-y-2">
                {macroMetrics.slice(0, 4).map((metric) => (
                  <div key={metric.label} className="flex items-start justify-between gap-3 p-1.5 rounded-lg hover:bg-purple-500/5 transition-colors">
                    <div>
                      <p className="text-[12px] font-semibold text-foreground/80">{metric.label}</p>
                      <p className="text-[10px] text-foreground/60 font-medium">{metric.note}</p>
                    </div>
                    <span className="text-sm font-bold">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 p-3 bg-card/60">
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="size-4 text-primary" />
            <p className="text-sm font-semibold">Finance & Economy News</p>
            {loadingNews && <Badge variant="outline">Refreshing</Badge>}
            {lastMarketRefresh && (
              <span className="ml-auto text-[11px] text-muted-foreground">Market updated {lastMarketRefresh}</span>
            )}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {news.slice(0, 6).map((item) => (
              <a
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="group rounded-lg border border-border/50 p-3 hover:border-primary/40 transition-colors bg-muted/10"
              >
                <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ExternalLink className="size-3" />
                    {item.source}
                  </span>
                  <span>{formatPublishedTime(item.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          {[...macroMetrics.slice(4), ...(netWorthMetric ? [netWorthMetric] : [])].map((metric) => (
            <div key={metric.label} className="rounded-lg border border-border/50 p-3 bg-background/60 shadow-sm hover:bg-background/80 hover:border-border/70 transition-all duration-200 cursor-default">
              <p className="text-[11px] text-foreground/70 font-semibold">{metric.label}</p>
              <p className="text-lg font-bold mt-0.5 text-foreground">{metric.value}</p>
              <p className="text-[10px] text-foreground/60 font-medium mt-1">{metric.note}</p>
            </div>
          ))}
        </div>

        {/* Global Currency Exchange */}
        <GlobalCurrencyExchange />
      </CardContent>
    </Card>
  );
}
