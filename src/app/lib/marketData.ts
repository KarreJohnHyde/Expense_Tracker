/* Live market data provider (Twelve Data) with optional local proxy. */

export type MarketProvider = 'twelvedata';

const env = (import.meta as any).env || {};
const API_MODE = (env.VITE_API_MODE as string) || '';
const LOCAL_API_URL = 'http://localhost:3001';
const MARKET_API_BASE = ((env.VITE_MARKET_API_BASE as string) || (API_MODE === 'local' ? LOCAL_API_URL : '')).trim();
const TWELVE_KEY = ((env.VITE_TWELVEDATA_API_KEY as string) || '').trim();

const DIRECT_BASE = 'https://api.twelvedata.com';
const API_BASE = MARKET_API_BASE || DIRECT_BASE;
const USE_PROXY = Boolean(MARKET_API_BASE);

export interface MarketStatus {
  configured: boolean;
  provider: MarketProvider;
  mode: 'proxy' | 'direct' | 'disabled';
  baseUrl: string;
}

export function getMarketStatus(): MarketStatus {
  const configured = USE_PROXY || Boolean(TWELVE_KEY);
  const mode = USE_PROXY ? 'proxy' : TWELVE_KEY ? 'direct' : 'disabled';
  return { configured, provider: 'twelvedata', mode, baseUrl: API_BASE };
}

export interface QuoteData {
  symbol: string;
  name?: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  datetime?: string;
  currency?: string;
  exchange?: string;
}

export interface TimeSeriesPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

async function fetchJson(path: string, params: Record<string, string | number | undefined | null>) {
  if (!USE_PROXY && !TWELVE_KEY) {
    throw new Error('Missing VITE_TWELVEDATA_API_KEY');
  }

  const base = API_BASE.replace(/\/$/, '');
  const url = new URL(base + path);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  if (!USE_PROXY) {
    url.searchParams.set('apikey', TWELVE_KEY);
  }

  const response = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data && (data.message || data.error)) || `Market data error: ${response.status}`);
  }

  if (data?.status === 'error' || data?.code) {
    throw new Error(data?.message || data?.code || 'Market data error');
  }

  return data;
}

function normalizeQuote(raw: any): QuoteData | null {
  if (!raw) return null;
  const price = parseNumber(raw.price ?? raw.close ?? raw.last ?? raw.value, NaN);
  if (!Number.isFinite(price)) return null;

  const previousClose = parseNumber(raw.previous_close ?? raw.prev_close ?? raw.previousClose, price);
  const change = parseNumber(raw.change ?? raw.change_amount, price - previousClose);
  const changePercent = parseNumber(
    raw.percent_change ?? raw.change_percent ?? raw.percentChange,
    previousClose ? (change / previousClose) * 100 : 0
  );

  return {
    symbol: raw.symbol || raw.ticker || raw.code || '',
    name: raw.name,
    price,
    open: parseNumber(raw.open ?? raw.open_price, price),
    high: parseNumber(raw.high ?? raw.high_price, price),
    low: parseNumber(raw.low ?? raw.low_price, price),
    previousClose,
    change,
    changePercent,
    volume: parseNumber(raw.volume, 0),
    datetime: raw.datetime || raw.timestamp || raw.time,
    currency: raw.currency,
    exchange: raw.exchange || raw.mic_code,
  };
}

export async function fetchQuotes(symbols: string[]): Promise<Record<string, QuoteData>> {
  if (symbols.length === 0) return {};
  const data = await fetchJson('/quote', { symbol: symbols.join(',') });

  // Single symbol response
  if (data?.symbol) {
    const normalized = normalizeQuote(data);
    return normalized ? { [symbols[0]]: normalized } : {};
  }

  // Batch response (map)
  if (data && typeof data === 'object') {
    const result: Record<string, QuoteData> = {};
    Object.keys(data).forEach((key) => {
      const normalized = normalizeQuote(data[key]);
      if (normalized) result[key] = normalized;
    });
    if (Object.keys(result).length) return result;
  }

  // Fallback: array response
  if (Array.isArray(data?.data)) {
    const result: Record<string, QuoteData> = {};
    for (const item of data.data) {
      const normalized = normalizeQuote(item);
      if (normalized) result[item.symbol || item.ticker || item.code] = normalized;
    }
    return result;
  }

  if (symbols.length > 1) {
    const results: Record<string, QuoteData> = {};
    const settled = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const single = await fetchJson('/quote', { symbol });
        const normalized = normalizeQuote(single);
        if (normalized) results[symbol] = normalized;
      })
    );
    if (settled.length > 0 && Object.keys(results).length > 0) return results;
  }

  return {};
}

export async function fetchTimeSeries(
  symbol: string,
  interval: string,
  outputsize = 60
): Promise<TimeSeriesPoint[]> {
  const data = await fetchJson('/time_series', {
    symbol,
    interval,
    outputsize,
  });

  const values: Array<Record<string, unknown>> = Array.isArray(data?.values) ? data.values : [];
  const mapped: TimeSeriesPoint[] = values.map((v) => ({
    time: String(v.datetime ?? v.date ?? v.time ?? ''),
    open: parseNumber(v.open),
    high: parseNumber(v.high),
    low: parseNumber(v.low),
    close: parseNumber(v.close),
    volume: parseNumber(v.volume, 0),
  }));
  const cleaned = mapped.filter((v) => Number.isFinite(v.close));
  return cleaned.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}
