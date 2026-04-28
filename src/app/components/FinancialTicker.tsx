import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchQuotes, getMarketStatus, type QuoteData } from '../lib/marketData';

interface TickerConfig {
  label: string;
  symbol?: string;
  fallbackPriceText: string;
  fallbackChangeText: string;
  fallbackUp: boolean;
  prefix?: string;
  decimals?: number;
}

interface TickerItem {
  label: string;
  value: string;
  change: string;
  up: boolean;
}

const ROW_1_CONFIG: TickerConfig[] = [
  { label: 'S&P 500', symbol: 'SPY', fallbackPriceText: '5,218.19', fallbackChangeText: '-0.21%', fallbackUp: false },
  { label: 'NASDAQ', symbol: 'QQQ', fallbackPriceText: '16,302.76', fallbackChangeText: '-0.38%', fallbackUp: false },
  { label: 'Dow Jones', symbol: 'DIA', fallbackPriceText: '39,069.59', fallbackChangeText: '+0.11%', fallbackUp: true },
  { label: 'FTSE 100', symbol: 'ISF.LON', fallbackPriceText: '8,078.86', fallbackChangeText: '+0.53%', fallbackUp: true },
  { label: 'Nikkei 225', symbol: 'EWJ', fallbackPriceText: '38,460.08', fallbackChangeText: '-0.34%', fallbackUp: false },
  { label: 'Hang Seng', symbol: 'EWH', fallbackPriceText: '16,541.42', fallbackChangeText: '-0.88%', fallbackUp: false },
  { label: 'Shanghai', symbol: 'MCHI', fallbackPriceText: '3,065.26', fallbackChangeText: '+0.45%', fallbackUp: true },
  { label: 'KOSPI', symbol: 'EWY', fallbackPriceText: '2,724.62', fallbackChangeText: '-0.12%', fallbackUp: false },
  { label: 'AAPL', symbol: 'AAPL', fallbackPriceText: '227.32', fallbackChangeText: '+1.08%', fallbackUp: true, prefix: '$', decimals: 2 },
  { label: 'MSFT', symbol: 'MSFT', fallbackPriceText: '413.19', fallbackChangeText: '+1.27%', fallbackUp: true, prefix: '$', decimals: 2 },
  { label: 'TSLA', symbol: 'TSLA', fallbackPriceText: '232.16', fallbackChangeText: '+3.43%', fallbackUp: true, prefix: '$', decimals: 2 },
  { label: 'NVDA', symbol: 'NVDA', fallbackPriceText: '914.27', fallbackChangeText: '+2.19%', fallbackUp: true, prefix: '$', decimals: 2 },
];

const ROW_2_CONFIG: TickerConfig[] = [
  { label: 'Gold (oz)', symbol: 'XAU/USD', fallbackPriceText: '$2,329.40', fallbackChangeText: '+0.89%', fallbackUp: true, prefix: '$', decimals: 2 },
  { label: 'Silver (oz)', symbol: 'XAG/USD', fallbackPriceText: '$27.42', fallbackChangeText: '+1.24%', fallbackUp: true, prefix: '$', decimals: 2 },
  { label: 'Brent Crude', symbol: 'BRENT', fallbackPriceText: '$87.12', fallbackChangeText: '-0.38%', fallbackUp: false, prefix: '$', decimals: 2 },
  { label: 'EUR/USD', symbol: 'EUR/USD', fallbackPriceText: '1.0721', fallbackChangeText: '+0.14%', fallbackUp: true, decimals: 4 },
  { label: 'GBP/USD', symbol: 'GBP/USD', fallbackPriceText: '1.2681', fallbackChangeText: '+0.09%', fallbackUp: true, decimals: 4 },
  { label: 'USD/JPY', symbol: 'USD/JPY', fallbackPriceText: '154.72', fallbackChangeText: '+0.32%', fallbackUp: true, decimals: 2 },
  { label: 'USD/INR', symbol: 'USD/INR', fallbackPriceText: '83.47', fallbackChangeText: '-0.08%', fallbackUp: false, decimals: 2 },
  { label: 'Bitcoin', symbol: 'BTC/USD', fallbackPriceText: '$64,220', fallbackChangeText: '+2.14%', fallbackUp: true, prefix: '$', decimals: 0 },
  { label: 'Ethereum', symbol: 'ETH/USD', fallbackPriceText: '$3,448', fallbackChangeText: '+1.88%', fallbackUp: true, prefix: '$', decimals: 0 },
  { label: 'World GDP Growth', fallbackPriceText: '3.2%', fallbackChangeText: 'IMF Forecast', fallbackUp: true },
  { label: 'India GDP Growth', fallbackPriceText: '7.8%', fallbackChangeText: 'FY2024', fallbackUp: true },
  { label: 'US CPI Inflation', fallbackPriceText: '3.5%', fallbackChangeText: 'YoY Mar', fallbackUp: false },
  { label: 'India CPI', fallbackPriceText: '4.85%', fallbackChangeText: 'Mar 2024', fallbackUp: false },
  { label: 'US Fed Rate', fallbackPriceText: '5.25–5.5%', fallbackChangeText: 'Unchanged', fallbackUp: true },
  { label: 'RBI Repo Rate', fallbackPriceText: '6.50%', fallbackChangeText: 'Unchanged', fallbackUp: true },
];

function formatValue(config: TickerConfig, price: number): string {
  const decimals = config.decimals ?? 2;
  const formatted = price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${config.prefix || ''}${formatted}`;
}

function toFallbackItem(config: TickerConfig): TickerItem {
  return {
    label: config.label,
    value: config.fallbackPriceText,
    change: config.fallbackChangeText,
    up: config.fallbackUp,
  };
}

function quoteToItem(config: TickerConfig, quote?: QuoteData): TickerItem {
  if (!quote || !Number.isFinite(quote.price)) {
    return toFallbackItem(config);
  }

  const change =
    typeof quote.changePercent === 'number' && Number.isFinite(quote.changePercent)
      ? quote.changePercent
      : 0;

  return {
    label: config.label,
    value: formatValue(config, quote.price),
    change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
    up: change >= 0,
  };
}

function TickerRow({ items, direction }: { items: TickerItem[]; direction: 'ltr' | 'rtl' }) {
  const doubled = [...items, ...items];
  const animClass = direction === 'ltr' ? 'animate-ticker-ltr' : 'animate-ticker-rtl';

  return (
    <div className="overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
      <div className={`flex gap-0 ${animClass} shrink-0`} style={{ width: 'max-content' }}>
        {doubled.map((item, i) => (
          <span
            key={`${item.label}-${i}`}
            className="inline-flex items-center gap-1.5 px-4 border-r border-white/10 shrink-0"
            style={{ minWidth: 'max-content' }}
          >
            <span className="text-[11px] font-semibold text-white/60 tracking-wide">{item.label}</span>
            <span className="text-[12px] font-bold text-white">{item.value}</span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{
                color: item.up ? '#00d4aa' : '#f87171',
                background: item.up ? 'rgba(0,212,170,0.12)' : 'rgba(248,113,113,0.12)',
              }}
            >
              {item.up ? '▲' : '▼'} {item.change}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function FinancialTicker() {
  const styleRef = useRef(false);
  const marketStatus = getMarketStatus();
  const [row1, setRow1] = useState<TickerItem[]>(() => ROW_1_CONFIG.map(toFallbackItem));
  const [row2, setRow2] = useState<TickerItem[]>(() => ROW_2_CONFIG.map(toFallbackItem));

  const loadTicker = useCallback(async () => {
    if (!marketStatus.configured) {
      setRow1(ROW_1_CONFIG.map(toFallbackItem));
      setRow2(ROW_2_CONFIG.map(toFallbackItem));
      return;
    }

    const allConfigs = [...ROW_1_CONFIG, ...ROW_2_CONFIG].filter((cfg) => cfg.symbol);
    const symbols = [...new Set(allConfigs.map((cfg) => cfg.symbol as string))];
    const resolvedQuotes = new Map<string, QuoteData>();

    const settled = await Promise.allSettled(
      symbols.map(async (symbol) => {
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

    setRow1(
      ROW_1_CONFIG.map((config) => {
        if (!config.symbol) return toFallbackItem(config);
        return quoteToItem(config, resolvedQuotes.get(config.symbol));
      }),
    );

    setRow2(
      ROW_2_CONFIG.map((config) => {
        if (!config.symbol) return toFallbackItem(config);
        return quoteToItem(config, resolvedQuotes.get(config.symbol));
      }),
    );
  }, [marketStatus.configured]);

  useEffect(() => {
    if (styleRef.current) return;
    styleRef.current = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ticker-ltr {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes ticker-rtl {
        0%   { transform: translateX(-50%); }
        100% { transform: translateX(0); }
      }
      .animate-ticker-ltr {
        animation: ticker-ltr 60s linear infinite;
      }
      .animate-ticker-rtl {
        animation: ticker-rtl 70s linear infinite;
      }
      .animate-ticker-ltr:hover,
      .animate-ticker-rtl:hover {
        animation-play-state: paused;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    void loadTicker();
    const timer = window.setInterval(() => {
      void loadTicker();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadTicker]);

  return (
    <div
      className="rounded-xl overflow-hidden space-y-0"
      style={{
        background: 'linear-gradient(135deg, rgba(0,30,22,0.95) 0%, rgba(10,10,40,0.95) 100%)',
        border: '1px solid rgba(0,212,170,0.15)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/8">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse" />
          <span className="text-[10px] font-bold text-[#00d4aa] uppercase tracking-widest">Live Markets</span>
        </span>
        <span className="ml-auto text-[10px] text-white/40">
          {marketStatus.configured ? 'Auto-refreshes every 30s' : 'Fallback feed'}
        </span>
      </div>

      <div className="py-1.5">
        <TickerRow items={row1} direction="ltr" />
      </div>

      <div className="h-px bg-white/5 mx-4" />

      <div className="py-1.5">
        <TickerRow items={row2} direction="rtl" />
      </div>
    </div>
  );
}
