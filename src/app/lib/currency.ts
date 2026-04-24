import { useEffect, useMemo, useState } from 'react';

export interface Currency {
  code: string;
  symbol: string;
  rate: number;
}

const CURRENCY_SETTINGS_KEY = 'settings:currency';
const CACHE_KEY = 'exchange_rates_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const SYMBOLS: Record<string, string> = {
  AED: 'د.إ',
  AUD: 'A$',
  BDT: '৳',
  BRL: 'R$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  CZK: 'Kč',
  DKK: 'kr',
  EUR: '€',
  GBP: '£',
  HKD: 'HK$',
  HUF: 'Ft',
  IDR: 'Rp',
  ILS: '₪',
  INR: '₹',
  JPY: '¥',
  KRW: '₩',
  LKR: 'Rs',
  MXN: '$',
  MYR: 'RM',
  NOK: 'kr',
  NZD: 'NZ$',
  PHP: '₱',
  PKR: 'Rs',
  PLN: 'zł',
  RUB: '₽',
  SAR: '﷼',
  SEK: 'kr',
  SGD: 'S$',
  THB: '฿',
  TRY: '₺',
  TWD: 'NT$',
  USD: '$',
  VND: '₫',
  ZAR: 'R',
};

// Fallback rates (base INR = 1)
const FALLBACK_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  JPY: 1.8,
  AED: 0.044,
  SGD: 0.016,
  AUD: 0.018,
  CAD: 0.016,
  CNY: 0.087,
  KRW: 16.0,
  CHF: 0.011,
  HKD: 0.093,
  NOK: 0.13,
  SEK: 0.13,
  DKK: 0.082,
  NZD: 0.02,
  ZAR: 0.22,
  SAR: 0.045,
  THB: 0.44,
  TRY: 0.46,
  RUB: 1.08,
  BRL: 0.067,
  MXN: 0.20,
  MYR: 0.057,
  IDR: 193,
  VND: 306,
  TWD: 0.38,
  PHP: 0.68,
  PLN: 0.045,
  CZK: 0.28,
  HUF: 4.2,
  ILS: 0.044,
  PKR: 3.3,
  LKR: 3.6,
  BDT: 1.4,
};

const FALLBACK_CURRENCIES: Currency[] = Object.keys(FALLBACK_RATES).map((code) => ({
  code,
  symbol: SYMBOLS[code] || code,
  rate: FALLBACK_RATES[code],
}));

interface RatesCache {
  rates: Record<string, number>;
  timestamp: number;
}

function getCachedRates(): RatesCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed: RatesCache = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setCachedRates(rates: Record<string, number>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
}

async function fetchLiveRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/INR');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result === 'success' && data.rates) {
      setCachedRates(data.rates);
      return data.rates;
    }
    return null;
  } catch {
    return null;
  }
}

function makeCurrency(code: string, rate: number): Currency {
  return {
    code,
    symbol: SYMBOLS[code] || code,
    rate,
  };
}

function sortWithInrDefault(currencies: Currency[]): Currency[] {
  return [...currencies].sort((a, b) => {
    if (a.code === 'INR') return -1;
    if (b.code === 'INR') return 1;
    return a.code.localeCompare(b.code);
  });
}

function buildCurrencies(liveRates: Record<string, number> | null): Currency[] {
  if (!liveRates) {
    return sortWithInrDefault(FALLBACK_CURRENCIES);
  }

  const fromLive = Object.keys(liveRates)
    .filter((code) => Number.isFinite(liveRates[code]) && liveRates[code] > 0)
    .map((code) => makeCurrency(code, liveRates[code]));

  if (fromLive.length === 0) {
    return sortWithInrDefault(FALLBACK_CURRENCIES);
  }

  return sortWithInrDefault(fromLive);
}

export const CURRENCIES = sortWithInrDefault(FALLBACK_CURRENCIES);

export function useCurrency() {
  const [currencyCode, setCurrencyCode] = useState(() => localStorage.getItem(CURRENCY_SETTINGS_KEY) || 'INR');
  const [currencies, setCurrencies] = useState<Currency[]>(CURRENCIES);
  const [ratesLive, setRatesLive] = useState(false);

  useEffect(() => {
    const cached = getCachedRates();
    if (cached) {
      setCurrencies(buildCurrencies(cached.rates));
      setRatesLive(true);
    }

    fetchLiveRates().then((rates) => {
      if (rates) {
        setCurrencies(buildCurrencies(rates));
        setRatesLive(true);
      }
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setCurrencyCode(localStorage.getItem(CURRENCY_SETTINGS_KEY) || 'INR');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('currency-changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('currency-changed', handleStorageChange);
    };
  }, []);

  const currency = useMemo(() => {
    const selected = currencies.find((entry) => entry.code === currencyCode);
    if (selected) return selected;

    const inr = currencies.find((entry) => entry.code === 'INR');
    return inr || currencies[0] || { code: 'INR', symbol: '₹', rate: 1 };
  }, [currencies, currencyCode]);

  const changeCurrency = (code: string) => {
    const exists = currencies.some((entry) => entry.code === code);
    const next = exists ? code : 'INR';
    localStorage.setItem(CURRENCY_SETTINGS_KEY, next);
    setCurrencyCode(next);
    window.dispatchEvent(new Event('currency-changed'));
  };

  const resetCurrencyToDefault = () => changeCurrency('INR');

  const formatCurrency = (amountInINR: number | undefined | null) => {
    if (amountInINR == null || Number.isNaN(amountInINR)) return `${currency.symbol}0.00`;
    const converted = amountInINR * currency.rate;
    const locale = currency.code === 'INR' ? 'en-IN' : 'en-US';
    return `${currency.symbol}${converted.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const convertToBase = (amountInSelectedCurrency: number) => {
    if (Number.isNaN(amountInSelectedCurrency)) return 0;
    return amountInSelectedCurrency / currency.rate;
  };

  return {
    currency,
    CURRENCIES: currencies,
    changeCurrency,
    resetCurrencyToDefault,
    formatCurrency,
    convertToBase,
    ratesLive,
  };
}