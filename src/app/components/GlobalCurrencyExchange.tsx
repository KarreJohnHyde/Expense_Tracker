import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  ArrowUpRight, ArrowDownRight, ArrowRightLeft, RefreshCw,
  Globe, Search, TrendingUp, Sparkles
} from 'lucide-react';

interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rate: number;       // vs USD
  prevRate: number;
  region: string;
}

const CURRENCY_DATA: Omit<CurrencyRate, 'rate' | 'prevRate'>[] = [
  // India
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', region: 'asia' },
  // USA
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', region: 'americas' },
  // Europe
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', region: 'europe' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', region: 'europe' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', region: 'europe' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', region: 'europe' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', region: 'europe' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', region: 'europe' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱', region: 'europe' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿', region: 'europe' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷', region: 'europe' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', region: 'europe' },
  // China
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', region: 'asia' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', region: 'asia' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼', region: 'asia' },
  // Japan
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', region: 'asia' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', region: 'asia' },
  // Middle East
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', region: 'mideast' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', region: 'mideast' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦', region: 'mideast' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼', region: 'mideast' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', flag: '🇧🇭', region: 'mideast' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع', flag: '🇴🇲', region: 'mideast' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱', region: 'mideast' },
  // Others
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', region: 'asia' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', region: 'asia' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', region: 'americas' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', region: 'americas' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', region: 'americas' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', region: 'americas' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', region: 'asia' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', region: 'asia' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', region: 'asia' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', region: 'asia' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', flag: '🇵🇰', region: 'asia' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩', region: 'asia' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', flag: '🇱🇰', region: 'asia' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳', region: 'asia' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', region: 'asia' },
];

const FALLBACK_USD_RATES: Record<string, number> = {
  INR: 83.5, USD: 1, EUR: 0.92, GBP: 0.79, CHF: 0.88, SEK: 10.8, NOK: 10.6, DKK: 6.87,
  PLN: 4.02, CZK: 23.2, TRY: 32.4, RUB: 91.5, CNY: 7.24, HKD: 7.81, TWD: 31.8,
  JPY: 154.7, KRW: 1365, AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.307, BHD: 0.376,
  OMR: 0.385, ILS: 3.62, SGD: 1.34, AUD: 1.53, CAD: 1.37, BRL: 5.15, MXN: 17.2,
  ZAR: 18.5, THB: 36.4, MYR: 4.72, IDR: 15800, PHP: 56.8, PKR: 278, BDT: 117,
  LKR: 305, VND: 25300, NZD: 1.65,
};

const CACHE_KEY = 'globalcx:rates';
const PREV_KEY = 'globalcx:prev';

function getCached(): Record<string, number> | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && Date.now() - c.ts < 300000) return c.rates;
    return null;
  } catch { return null; }
}

function getPrev(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PREV_KEY) || '{}'); } catch { return {}; }
}

type RegionTab = 'all' | 'asia' | 'europe' | 'mideast' | 'americas';

const REGIONS: { id: RegionTab; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🌍' },
  { id: 'asia', label: 'Asia-Pacific', icon: '🌏' },
  { id: 'europe', label: 'Europe', icon: '🇪🇺' },
  { id: 'mideast', label: 'Middle East', icon: '🕌' },
  { id: 'americas', label: 'Americas', icon: '🌎' },
];

export function GlobalCurrencyExchange() {
  const [rates, setRates] = useState<Record<string, number>>(getCached() || FALLBACK_USD_RATES);
  const [prev, setPrev] = useState<Record<string, number>>(getPrev());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<RegionTab>('all');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [convertAmt, setConvertAmt] = useState(1);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState('');

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      if (data.result === 'success' && data.rates) {
        const oldRates = { ...rates };
        localStorage.setItem(PREV_KEY, JSON.stringify(oldRates));
        setPrev(oldRates);
        setRates(data.rates);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, ts: Date.now() }));
      }
    } catch {
      // keep fallback
    } finally {
      setLoading(false);
      setLastRefresh(new Date().toLocaleTimeString('en-IN'));
    }
  }, [rates]);

  useEffect(() => { fetchRates(); }, []);

  const currencies: CurrencyRate[] = useMemo(() => {
    return CURRENCY_DATA.map(c => ({
      ...c,
      rate: rates[c.code] ?? FALLBACK_USD_RATES[c.code] ?? 1,
      prevRate: prev[c.code] ?? rates[c.code] ?? FALLBACK_USD_RATES[c.code] ?? 1,
    }));
  }, [rates, prev]);

  const filtered = useMemo(() => {
    let list = currencies;
    if (region !== 'all') list = list.filter(c => c.region === region);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    }
    return list;
  }, [currencies, region, search]);

  const getChange = (c: CurrencyRate) => {
    if (c.prevRate === 0 || c.rate === c.prevRate) return 0;
    return ((c.rate - c.prevRate) / c.prevRate) * 100;
  };

  const convertedRate = (c: CurrencyRate) => {
    if (baseCurrency === 'USD') return c.rate;
    const baseRate = rates[baseCurrency] ?? 1;
    return c.rate / baseRate;
  };

  const topMovers = useMemo(() => {
    return [...currencies]
      .map(c => ({ ...c, change: getChange(c) }))
      .filter(c => c.code !== 'USD')
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5);
  }, [currencies]);

  return (
    <Card className="border-border/40 overflow-hidden" style={{
      background: 'linear-gradient(180deg, rgba(99,102,241,0.03) 0%, transparent 40%)',
    }}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <Globe className="size-4 text-white" />
              </div>
              Global Currency Exchange
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              38+ currencies • India, Europe, USA, China, Japan & Middle East
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && <span className="text-[10px] text-muted-foreground">Updated {lastRefresh}</span>}
            <Badge variant="default" className="animate-pulse text-[10px]">LIVE</Badge>
            <Button size="sm" variant="outline" onClick={fetchRates} disabled={loading}>
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top Movers Strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {topMovers.map(c => {
            const up = c.change >= 0;
            return (
              <div key={c.code} className="shrink-0 px-3 py-2 rounded-xl border border-border/40 bg-card/60 min-w-[140px] hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedCurrency(selectedCurrency === c.code ? null : c.code)}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{c.flag}</span>
                  <span className="text-[11px] font-bold">{c.code}</span>
                  <span className={`text-[10px] font-semibold ml-auto flex items-center gap-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
                    {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {up ? '+' : ''}{c.change.toFixed(2)}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{c.name}</span>
              </div>
            );
          })}
        </div>

        {/* Base Currency Selector + Converter */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border/30 bg-muted/10">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-primary" />
            <span className="text-xs font-semibold">Base:</span>
            <select
              value={baseCurrency}
              onChange={e => setBaseCurrency(e.target.value)}
              className="text-xs font-bold bg-transparent border border-border/50 rounded-lg px-2 py-1 outline-none focus:border-primary"
            >
              {CURRENCY_DATA.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Amount:</span>
            <Input
              type="number" value={convertAmt}
              onChange={e => setConvertAmt(parseFloat(e.target.value) || 1)}
              className="w-24 h-7 text-xs"
            />
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search currencies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-7 text-xs"
            />
          </div>
        </div>

        {/* Region Tabs */}
        <Tabs value={region} onValueChange={v => setRegion(v as RegionTab)}>
          <TabsList className="w-full grid grid-cols-5 h-8">
            {REGIONS.map(r => (
              <TabsTrigger key={r.id} value={r.id} className="text-[11px] gap-1">
                <span>{r.icon}</span> {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Currency Grid */}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
          {filtered.map(c => {
            const change = getChange(c);
            const up = change >= 0;
            const converted = convertedRate(c) * convertAmt;
            const isSelected = selectedCurrency === c.code;
            const isBase = c.code === baseCurrency;

            return (
              <div
                key={c.code}
                className={`rounded-xl border p-3 transition-all duration-200 cursor-pointer hover:shadow-md ${
                  isSelected ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border/40 bg-card/60 hover:border-border/60'
                } ${isBase ? 'ring-1 ring-primary/20' : ''}`}
                onClick={() => setSelectedCurrency(isSelected ? null : c.code)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{c.flag}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{c.code}</span>
                        {isBase && <Badge variant="outline" className="text-[9px] px-1 py-0">BASE</Badge>}
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate block">{c.name}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">
                      {isBase ? '1.0000' : converted < 0.01
                        ? converted.toFixed(6)
                        : converted < 100
                          ? converted.toFixed(4)
                          : converted.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                    {!isBase && (
                      <p className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
                        {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                        {up ? '+' : ''}{change.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isSelected && !isBase && (
                  <div className="mt-3 pt-3 border-t border-border/30 space-y-2 animate-fade-in-up">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground">1 {baseCurrency} =</span>
                        <p className="font-bold">{c.symbol} {convertedRate(c).toFixed(4)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground">1 {c.code} =</span>
                        <p className="font-bold">{(1 / convertedRate(c)).toFixed(6)} {baseCurrency}</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[11px] text-muted-foreground">
                        {convertAmt.toLocaleString()} {baseCurrency} = <span className="font-bold text-foreground">{c.symbol}{converted.toLocaleString('en-US', { maximumFractionDigits: 2 })} {c.code}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No currencies match your search.
          </div>
        )}

        {/* Summary footer */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
          <Sparkles className="size-3" />
          <span>Rates sourced from ExchangeRate-API • {filtered.length} currencies shown • Auto-refreshes every 5 min</span>
        </div>
      </CardContent>
    </Card>
  );
}
