import { useState, useEffect } from 'react';

export interface Currency {
  code: string;
  symbol: string;
  rate: number;
}

// Fallback rates (INR base)
const FALLBACK_CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹', rate: 1 },
  { code: 'USD', symbol: '$', rate: 0.012 },
  { code: 'EUR', symbol: '€', rate: 0.011 },
  { code: 'GBP', symbol: '£', rate: 0.0095 },
  { code: 'JPY', symbol: '¥', rate: 1.8 },
  { code: 'AED', symbol: 'د.إ', rate: 0.044 },
  { code: 'SGD', symbol: 'S$', rate: 0.016 },
  { code: 'AUD', symbol: 'A$', rate: 0.018 },
  { code: 'CAD', symbol: 'C$', rate: 0.016 },
  { code: 'CNY', symbol: '¥', rate: 0.087 },
];

const CACHE_KEY = 'exchange_rates_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

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

function buildCurrencies(liveRates: Record<string, number> | null): Currency[] {
  if (!liveRates) return FALLBACK_CURRENCIES;

  const symbols: Record<string, string> = {
    INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥',
    AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$', CNY: '¥',
  };

  const codes = Object.keys(symbols);
  return codes.map(code => ({
    code,
    symbol: symbols[code],
    rate: liveRates[code] || FALLBACK_CURRENCIES.find(c => c.code === code)?.rate || 1,
  }));
}

export const CURRENCIES = FALLBACK_CURRENCIES; // static export for legacy use

export function useCurrency() {
  const [currencyCode, setCurrencyCode] = useState(() => {
    return localStorage.getItem('settings:currency') || 'INR';
  });
  const [currencies, setCurrencies] = useState<Currency[]>(FALLBACK_CURRENCIES);
  const [ratesLive, setRatesLive] = useState(false);

  // Fetch live rates on mount
  useEffect(() => {
    const cached = getCachedRates();
    if (cached) {
      setCurrencies(buildCurrencies(cached.rates));
      setRatesLive(true);
    }
    fetchLiveRates().then(rates => {
      if (rates) {
        setCurrencies(buildCurrencies(rates));
        setRatesLive(true);
      }
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setCurrencyCode(localStorage.getItem('settings:currency') || 'INR');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('currency-changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('currency-changed', handleStorageChange);
    };
  }, []);

  const changeCurrency = (code: string) => {
    localStorage.setItem('settings:currency', code);
    setCurrencyCode(code);
    window.dispatchEvent(new Event('currency-changed'));
  };

  const currency = currencies.find((c: Currency) => c.code === currencyCode) || currencies[0];

  const formatCurrency = (amountInINR: number | undefined | null) => {
    if (amountInINR == null || isNaN(amountInINR)) return `${currency.symbol}0.00`;
    const converted = amountInINR * currency.rate;
    return `${currency.symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const convertToBase = (amountInSelectedCurrency: number) => {
    if (isNaN(amountInSelectedCurrency)) return 0;
    return amountInSelectedCurrency / currency.rate;
  };

  return { currency, CURRENCIES: currencies, changeCurrency, formatCurrency, convertToBase, ratesLive };
}
